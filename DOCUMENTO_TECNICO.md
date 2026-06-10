# Documento Técnico – Sistema de Ventas Online
## Evaluación 3 – Microservicios y Servicios Cloud AWS

---

## 1. Descripción General

El sistema es una plataforma de ventas online construida sobre una arquitectura de microservicios desplegada en AWS. Extiende el proyecto de la evaluación anterior incorporando validación de cuentas por correo electrónico, notificaciones automáticas de compras y pagos, almacenamiento de archivos en la nube con Amazon S3, y notificaciones SMS/WhatsApp al subir archivos.

---

## 2. Arquitectura Implementada

### 2.1 Diagrama de Componentes

```
Usuarios (Navegador)
        │
        ▼
Application Load Balancer (ALB)
online-sales-alb-1964549465.us-east-1.elb.amazonaws.com
        │
        ├──► Frontend (Angular) ─── ECS Fargate
        ├──► Backend (FastAPI)  ─── ECS Fargate
        └──► Payment Service   ─── ECS Fargate
                │
                ├──► Amazon RDS (PostgreSQL)
                ├──► Amazon S3 (Archivos de usuarios)
                └──► Microservicio Notificaciones ─── EC2 (Docker)
                              │
                              ├──► SMTP (Gmail) → Correos
                              └──► Twilio → SMS / WhatsApp
```

### 2.2 Servicios AWS Utilizados

| Servicio | Uso |
|---|---|
| **Amazon ECS Fargate** | Ejecución de contenedores para backend, payment service y frontend |
| **Amazon EC2 (t2.micro)** | Aloja el microservicio de notificaciones en Docker |
| **Amazon RDS PostgreSQL (db.t3.micro)** | Base de datos relacional del sistema |
| **Amazon S3** | Almacenamiento de archivos de usuarios |
| **Amazon ECR** | Registro privado de imágenes Docker |
| **Application Load Balancer** | Enrutamiento de tráfico hacia los microservicios |
| **Amazon CloudWatch** | Logs de los contenedores ECS |
| **Amazon IAM** | Gestión de permisos y roles |

---

## 3. Microservicios

### 3.1 Backend (FastAPI) — Puerto 8000
Servicio principal que gestiona:
- Autenticación de usuarios (JWT)
- Registro con generación de código de verificación (6 dígitos)
- Productos y catálogo
- Carrito de compras por usuario
- Checkout y coordinación de pagos
- Gestión de archivos S3

**Endpoints principales:**
- `POST /users/register` — Registro y envío de código de verificación
- `POST /users/verify` — Activación de cuenta
- `POST /users/login` — Autenticación JWT
- `GET /products/` — Listado de productos
- `POST /cart/add` — Agregar al carrito
- `POST /checkout/` — Procesar compra
- `POST /files/upload` — Subir archivo a S3
- `GET /files/` — Listar archivos y espacio usado

### 3.2 Payment Service (FastAPI) — Puerto 8001
Microservicio dedicado al procesamiento de pagos con Mercado Pago. Recibe la solicitud del backend, ejecuta el pago y retorna el resultado con el ID de transacción.

### 3.3 Frontend (Angular 17) — Puerto 80
SPA standalone con las vistas:
- Registro con campos nombre, email, contraseña y teléfono
- Verificación de cuenta (ingreso del código de 6 dígitos)
- Login
- Catálogo de productos
- Carrito lateral (drawer)
- Checkout con formulario de tarjeta
- Gestión de archivos (subida drag & drop, visualización de espacio)

### 3.4 Microservicio de Notificaciones (FastAPI) — Puerto 8002
Desplegado en instancia EC2 (Amazon Linux 2023, t2.micro) con Docker.
Centraliza el envío de:
- Correos electrónicos vía SMTP (Gmail)
- SMS / WhatsApp vía Twilio

El backend lo llama por HTTP. Si el servicio no está disponible, el backend hace el envío directamente como fallback.

**Endpoints:**
- `POST /notify/email/verification` — Correo de validación de cuenta
- `POST /notify/email/purchase` — Correo de confirmación de compra
- `POST /notify/email/payment` — Correo de detalle de pago
- `POST /notify/sms/file-upload` — SMS/WhatsApp al subir archivo

---

## 4. Flujos Principales

### Flujo 1 — Registro y Validación
```
1. Usuario llena formulario (nombre, email, contraseña, teléfono)
2. Backend genera código de 6 dígitos aleatorio
3. Backend llama a notification-service → correo con código
4. Usuario ingresa código en /verify
5. Backend activa la cuenta (is_verified = true)
6. Usuario puede iniciar sesión
```

### Flujo 2 — Compra y Pago
```
1. Usuario autenticado agrega productos al carrito
2. En checkout ingresa datos de tarjeta
3. Backend llama a payment-service con monto y datos
4. Payment-service procesa pago con Mercado Pago
5. Si aprobado → backend llama a notification-service
   - Correo con resumen de compra (productos, total, fecha)
   - Correo con detalle del pago (ID transacción, monto, estado)
```

### Flujo 3 — Subida de Archivos
```
1. Usuario sube archivo desde /files
2. Backend verifica que no exceda 2 GB por usuario
3. Archivo se almacena en S3: bucket/user-{id}/filename
4. Backend actualiza storage_used en base de datos
5. Backend llama a notification-service → SMS/WhatsApp con:
   - Nombre del archivo
   - Fecha y hora de carga
   - Espacio utilizado
   - Espacio disponible restante
```

---

## 5. Almacenamiento en S3 — Justificación de Alternativa B

Se implementó la **Alternativa B: bucket centralizado con carpetas por usuario** (`user-{id}/`).

**Justificación técnica:**

| Factor | Alternativa A (bucket por usuario) | Alternativa B (carpetas, elegida) |
|---|---|---|
| **Límite de buckets AWS** | 100-1000 por cuenta | Sin límite de carpetas |
| **Gestión de permisos** | Compleja por usuario | Centralizada con prefijos |
| **Costo** | Similar | Similar |
| **Escalabilidad** | Limitada por cuota de buckets | Ilimitada |
| **Mantenimiento** | Un bucket por usuario creado dinámicamente | Un solo bucket, sin gestión extra |

Con la Alternativa B se evita alcanzar el límite de buckets de AWS y simplifica la gestión de CORS, políticas y lifecycle rules al tener un único recurso centralizado.

---

## 6. Pipeline CI/CD

Se utiliza **GitHub Actions** con el workflow `.github/workflows/deploy.yml`.

### Etapas del Pipeline

```
Push a main
    │
    ▼
[Build] Construye y publica 4 imágenes Docker en ECR
    ├── backend-fastapi:latest
    ├── payment-service:latest
    ├── frontend-angular:latest
    └── notification-service:latest
    │
    ▼ (en paralelo)
[Deploy Backend]     → ECS Fargate (actualiza task definition)
[Deploy Payment]     → ECS Fargate (actualiza task definition)
[Deploy Frontend]    → ECS Fargate (actualiza task definition)
[Deploy Notification]→ EC2 vía SSH (docker pull + docker run)
```

Todos los secretos (credenciales AWS, SMTP, Twilio, base de datos) se inyectan como variables de entorno en tiempo de despliegue desde GitHub Secrets, sin estar hardcodeados en el código.

---

## 7. Seguridad

- Autenticación mediante **JWT Bearer tokens** con expiración
- Contraseñas hasheadas con **bcrypt**
- Usuarios no pueden iniciar sesión sin verificar su correo
- Secrets de producción almacenados en **GitHub Secrets**, nunca en el repositorio
- Security groups de AWS restringen el acceso:
  - RDS: solo accesible desde los contenedores ECS
  - EC2 (notification): solo accesible desde ECS y SSH para CI/CD
  - ALB: único punto de entrada público (puertos 80/443)
- Archivos S3 accedidos mediante **URLs prefirmadas** (presigned URLs) con expiración de 1 hora

---

## 8. Infraestructura Desplegada

| Recurso | Identificador / Endpoint |
|---|---|
| ALB (URL pública) | `http://online-sales-alb-1964549465.us-east-1.elb.amazonaws.com` |
| ECS Cluster | `online-sales-cluster` |
| RDS Endpoint | `nexstore-db.cwnm04kga8ij.us-east-1.rds.amazonaws.com` |
| S3 Bucket | `nexstore-user-files` |
| EC2 Notification | IP `44.193.77.218`, puerto `8002` |
| ECR Registry | `788356290964.dkr.ecr.us-east-1.amazonaws.com` |
| Región AWS | `us-east-1` |

---

## 9. Tecnologías Utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | Angular 17 (standalone components) |
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| Base de datos | PostgreSQL 16 (Amazon RDS) |
| Contenedores | Docker + Amazon ECS Fargate |
| Orquestación | Amazon ECS |
| Almacenamiento | Amazon S3 |
| Correo | SMTP (Gmail) vía smtplib |
| SMS/WhatsApp | Twilio |
| CI/CD | GitHub Actions |
| Registry | Amazon ECR |
| Autenticación | JWT (python-jose) + bcrypt |
