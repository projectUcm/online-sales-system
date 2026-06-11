import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Product } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent implements OnInit {
  products: Product[] = [];
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
    await this.load();
  }

  async load() {
    this.loading = true;
    try { this.products = await this.api.getProducts(); }
    catch { this.error = 'Error al cargar productos.'; }
    finally { this.loading = false; this.cdr.markForCheck(); }
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
        this.success = 'Producto actualizado correctamente.';
      } else {
        await this.api.createProduct(this.form.name, this.form.price, this.form.stock);
        this.success = 'Producto publicado. Notificación WhatsApp enviada.';
      }
      this.showForm = false;
      this.editingId = null;
      await this.load();
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
      await this.load();
    } catch {
      this.error = 'Error al eliminar.';
    }
  }

  logout() { this.auth.logout(); }

  getImg(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop'))
      return 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=60';
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
      return 'https://images.pexels.com/photos/163125/pexels-photo-163125.jpeg?auto=compress&cs=tinysrgb&w=60';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=60';
    return 'https://images.pexels.com/photos/325153/pexels-photo-325153.jpeg?auto=compress&cs=tinysrgb&w=60';
  }
}
