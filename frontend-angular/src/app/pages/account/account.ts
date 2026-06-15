import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Order } from '../../services/api';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  expandedId: number | null = null;

  phone = '';
  phoneEdit = false;
  phoneInput = '';
  phoneSaving = false;
  phoneMsg = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    try {
      const [orders, me] = await Promise.all([
        this.api.getMyOrders(),
        this.api.getMe(),
      ]);
      this.orders = orders;
      this.phone = me.phone || '';
    } catch {
      this.orders = [];
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  toggle(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  totalSpent(): number {
    return this.orders.reduce((sum, o) => sum + o.total, 0);
  }

  startEditPhone() {
    this.phoneInput = this.phone;
    this.phoneEdit = true;
    this.phoneMsg = '';
  }

  cancelEditPhone() {
    this.phoneEdit = false;
    this.phoneMsg = '';
  }

  async savePhone() {
    if (!this.phoneInput.trim()) return;
    this.phoneSaving = true;
    try {
      const res = await this.api.updatePhone(this.phoneInput.trim());
      this.phone = res.phone;
      this.phoneEdit = false;
      this.phoneMsg = 'Teléfono actualizado correctamente';
    } catch {
      this.phoneMsg = 'Error al actualizar el teléfono';
    } finally {
      this.phoneSaving = false;
      this.cdr.markForCheck();
    }
  }
}
