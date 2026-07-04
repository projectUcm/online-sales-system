import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { CartService } from '../../services/cart.service';
import { getProductImage } from '../../utils/product-visuals';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.css',
})
export class CartDrawer {
  constructor(
    public drawer: CartDrawerService,
    public cart: CartService,
    private router: Router,
  ) {}

  async remove(itemId: number) {
    await this.cart.remove(itemId);
  }

  goCheckout() {
    this.drawer.close();
    this.router.navigate(['/checkout']);
  }

  getImg(name: string): string {
    return getProductImage(name, 120);
  }
}
