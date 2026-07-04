import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Product, AdminStats, AuditEvent } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

const EVENT_TYPE_LABELS: Record<string, string> = {
  user_register: 'Registro de usuario',
  login: 'Inicio de sesión',
  login_failed: 'Inicio de sesión fallido',
  logout: 'Cierre de sesión',
  purchase: 'Compra',
  payment: 'Pago',
  file_upload: 'Carga de archivo',
  account_validation: 'Validación de cuenta',
  admin_action: 'Acción administrativa',
  system_error: 'Error del sistema',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent implements OnInit {
  tab: 'products' | 'orders' | 'audit' = 'products';
  stats: AdminStats = { total_orders: 0, total_revenue: 0, total_products: 0, total_clients: 0 };
  products: Product[] = [];
  allOrders: any[] = [];
  auditEvents: AuditEvent[] = [];
  auditFilter = '';
  auditLoading = false;
  eventTypes = Object.keys(EVENT_TYPE_LABELS);
  loading = false;
  error = '';
  success = '';

  showForm = false;
  editingId: number | null = null;
  form = { name: '', price: 0, stock: 0 };
  saving = false;
  deleteConfirmId: number | null = null;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadProducts(), this.loadStats()]);
  }

  async loadProducts() {
    this.loading = true;
    try { this.products = await this.api.getProducts(); }
    catch { this.error = 'Error al cargar productos.'; }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }

  async loadStats() {
    try { this.stats = await this.api.getAdminStats(); }
    catch {}
    finally { this.cdr.markForCheck(); }
  }

  async loadOrders() {
    try { this.allOrders = await this.api.getAllOrders(); }
    catch { this.allOrders = []; }
    finally { this.cdr.markForCheck(); }
  }

  async setTab(t: 'products' | 'orders' | 'audit') {
    this.tab = t;
    this.cdr.detectChanges();
    if (t === 'orders' && this.allOrders.length === 0) await this.loadOrders();
    if (t === 'audit' && this.auditEvents.length === 0) await this.loadAuditEvents();
  }

  async loadAuditEvents() {
    this.auditLoading = true;
    try { this.auditEvents = await this.api.getAuditEvents(this.auditFilter); }
    catch { this.auditEvents = []; }
    finally { this.auditLoading = false; this.cdr.markForCheck(); }
  }

  async filterAudit(type: string) {
    this.auditFilter = type;
    await this.loadAuditEvents();
  }

  eventLabel(type: string): string {
    return EVENT_TYPE_LABELS[type] ?? type;
  }

  openCreate() {
    this.editingId = null;
    this.form = { name: '', price: 0, stock: 0 };
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  openEdit(p: Product) {
    this.editingId = p.id;
    this.form = { name: p.name, price: p.price, stock: p.stock };
    this.showForm = true;
    this.error = '';
    this.success = '';
  }

  cancelForm() { this.showForm = false; this.editingId = null; }

  async save() {
    if (!this.form.name.trim()) { this.error = 'El nombre es obligatorio'; return; }
    if (this.form.price <= 0) { this.error = 'El precio debe ser mayor a 0'; return; }
    this.saving = true;
    this.error = '';
    try {
      if (this.editingId) {
        await this.api.updateProduct(this.editingId, this.form.name, this.form.price, this.form.stock);
        this.success = 'Producto actualizado.';
      } else {
        await this.api.createProduct(this.form.name, this.form.price, this.form.stock);
        this.success = 'Producto publicado. WhatsApp enviado.';
      }
      this.showForm = false;
      this.editingId = null;
      await Promise.all([this.loadProducts(), this.loadStats()]);
    } catch {
      this.error = 'Error al guardar. Intenta nuevamente.';
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  confirmDelete(id: number) { this.deleteConfirmId = id; }
  cancelDelete() { this.deleteConfirmId = null; }

  async doDelete(id: number) {
    try {
      await this.api.deleteProduct(id);
      this.success = 'Producto eliminado.';
      this.deleteConfirmId = null;
      await Promise.all([this.loadProducts(), this.loadStats()]);
    } catch {
      this.error = 'Error al eliminar.';
    }
    this.cdr.markForCheck();
  }

  getImg(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop'))
      return 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('mouse'))
      return 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('monitor') || n.includes('pantalla'))
      return 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('teclado') || n.includes('keyboard'))
      return 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('auricular') || n.includes('headphone') || n.includes('sony'))
      return 'https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.pexels.com/photos/117729/pexels-photo-117729.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('ram') || n.includes('memoria') || n.includes('corsair'))
      return 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=60';
    return 'https://images.pexels.com/photos/325153/pexels-photo-325153.jpeg?auto=compress&cs=tinysrgb&w=60';
  }

  logout() { this.auth.logout(); }
}
