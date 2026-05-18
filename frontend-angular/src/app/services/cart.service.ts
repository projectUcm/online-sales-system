import { Injectable, signal, computed } from '@angular/core';
import { ApiService, CartItem } from './api';

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>([]);
  count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  total = computed(() => this.items().reduce((sum, i) => sum + i.price * i.quantity, 0));

  constructor(private api: ApiService) {}

  async load() {
    try {
      const items = await this.api.getCart();
      this.items.set(items);
    } catch {}
  }

  async add(productId: number) {
    await this.api.addToCart(productId);
    await this.load();
  }

  async remove(itemId: number) {
    await this.api.removeFromCart(itemId);
    await this.load();
  }
}
