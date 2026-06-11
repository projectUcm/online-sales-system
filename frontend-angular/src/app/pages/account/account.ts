import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Order } from '../../services/api';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  expandedId: number | null = null;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    try { this.orders = await this.api.getMyOrders(); }
    catch { this.orders = []; }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }

  toggle(id: number) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  totalSpent(): number {
    return this.orders.reduce((sum, o) => sum + o.total, 0);
  }
}
