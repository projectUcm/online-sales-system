import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { CartService } from '../../services/cart.service';

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
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop'))
      return 'https://picsum.photos/seed/laptop/120/120';
    if (n.includes('mouse'))
      return 'https://picsum.photos/seed/mouse/120/120';
    if (n.includes('monitor') || n.includes('pantalla'))
      return 'https://picsum.photos/seed/monitor/120/120';
    if (n.includes('teclado') || n.includes('keyboard'))
      return 'https://picsum.photos/seed/keyboard/120/120';
    if (n.includes('auricular') || n.includes('headphone') || n.includes('sony'))
      return 'https://picsum.photos/seed/headphones/120/120';
    if (n.includes('webcam') || n.includes('camara'))
      return 'https://picsum.photos/seed/webcam/120/120';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://picsum.photos/seed/storage/120/120';
    if (n.includes('ram') || n.includes('memoria') || n.includes('corsair'))
      return 'https://picsum.photos/seed/memory/120/120';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://picsum.photos/seed/chair/120/120';
    if (n.includes('pad') || n.includes('mousepad'))
      return 'https://picsum.photos/seed/mousepad/120/120';
    return 'https://picsum.photos/seed/tech/120/120';
  }
}
