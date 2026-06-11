from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config.settings import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Add new columns to existing tables without breaking current data."""
    is_pg = not settings.database_url.startswith("sqlite")
    with engine.connect() as conn:
        if is_pg:
            migrations = [
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR DEFAULT ''",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR DEFAULT ''",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_used INTEGER DEFAULT 0",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'client'",
                "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)",
                """CREATE TABLE IF NOT EXISTS orders (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    order_ref VARCHAR NOT NULL,
                    total FLOAT NOT NULL,
                    status VARCHAR DEFAULT 'approved',
                    items_json VARCHAR NOT NULL,
                    created_at VARCHAR NOT NULL
                )""",
            ]
        else:
            migrations = []
            raw = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            existing = {r[1] for r in raw}
            if "name" not in existing:
                migrations.append("ALTER TABLE users ADD COLUMN name VARCHAR DEFAULT ''")
            if "phone" not in existing:
                migrations.append("ALTER TABLE users ADD COLUMN phone VARCHAR DEFAULT ''")
            if "is_verified" not in existing:
                migrations.append("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0")
            if "verification_code" not in existing:
                migrations.append("ALTER TABLE users ADD COLUMN verification_code VARCHAR")
            if "storage_used" not in existing:
                migrations.append("ALTER TABLE users ADD COLUMN storage_used INTEGER DEFAULT 0")
            if "role" not in existing:
                migrations.append("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'client'")
            raw2 = conn.execute(text("PRAGMA table_info(cart_items)")).fetchall()
            existing2 = {r[1] for r in raw2}
            if "user_id" not in existing2:
                migrations.append("ALTER TABLE cart_items ADD COLUMN user_id INTEGER REFERENCES users(id)")

        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                print(f"[MIGRATION] {e}")
