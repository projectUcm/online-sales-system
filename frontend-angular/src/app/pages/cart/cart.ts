import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, CartItem } from '../../services/api';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit {
  items: CartItem[] = [];
  message = '';
  error = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadCart();
  }

  async loadCart() {
    try {
      this.items = await this.api.getCart();
    } catch {
      this.message = 'Error al cargar el carrito';
      this.error = true;
    } finally {
      this.cdr.markForCheck();
    }
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  async remove(itemId: number) {
    try {
      await this.api.removeFromCart(itemId);
      await this.loadCart();
    } catch {
      this.message = 'Error al eliminar el producto';
      this.error = true;
      this.cdr.markForCheck();
    }
  }

  goToCheckout() {
    this.router.navigate(['/checkout']);
  }
}