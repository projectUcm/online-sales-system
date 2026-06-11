import { Injectable, signal, computed } from '@angular/core';
import { ApiService, CartItem } from './api';
import { AuthService } from './auth';

const GUEST_KEY = 'nexstore_guest_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>([]);
  count = computed(() => this.items().reduce((sum, i) => sum + i.quantity, 0));
  total = computed(() => this.items().reduce((sum, i) => sum + i.price * i.quantity, 0));

  constructor(private api: ApiService, private auth: AuthService) {}

  async load() {
    if (this.auth.isLoggedIn()) {
      try {
        const items = await this.api.getCart();
        this.items.set(items);
      } catch {}
    } else {
      this.items.set(this._loadGuest());
    }
  }

  async add(productId: number, product?: { name: string; price: number }) {
    if (this.auth.isLoggedIn()) {
      await this.api.addToCart(productId);
      await this.load();
    } else if (product) {
      const guest = this._loadGuest();
      const existing = guest.find(i => i.product_id === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        guest.push({ id: productId, product_id: productId, product_name: product.name, price: product.price, quantity: 1 });
      }
      this._saveGuest(guest);
      this.items.set([...guest]);
    }
  }

  async remove(itemId: number) {
    if (this.auth.isLoggedIn()) {
      await this.api.removeFromCart(itemId);
      await this.load();
    } else {
      const guest = this._loadGuest().filter(i => i.product_id !== itemId);
      this._saveGuest(guest);
      this.items.set([...guest]);
    }
  }

  clearGuest() {
    localStorage.removeItem(GUEST_KEY);
    this.items.set([]);
  }

  private _loadGuest(): CartItem[] {
    try { return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]'); }
    catch { return []; }
  }

  private _saveGuest(items: CartItem[]) {
    localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  }
}
