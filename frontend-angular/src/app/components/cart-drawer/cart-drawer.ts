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
      return 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=120&q=80&auto=format&fit=crop';
    if (n.includes('mouse'))
      return 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=120&q=80&auto=format&fit=crop';
    if (n.includes('monitor') || n.includes('pantalla'))
      return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=120&q=80&auto=format&fit=crop';
    if (n.includes('teclado') || n.includes('keyboard'))
      return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=120&q=80&auto=format&fit=crop';
    if (n.includes('auricular') || n.includes('headphone') || n.includes('sony'))
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80&auto=format&fit=crop';
    if (n.includes('webcam') || n.includes('camara'))
      return 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=120&q=80&auto=format&fit=crop';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.unsplash.com/photo-1597225244516-7b0b75d2e12a?w=120&q=80&auto=format&fit=crop';
    if (n.includes('ram') || n.includes('memoria') || n.includes('corsair'))
      return 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=120&q=80&auto=format&fit=crop';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://images.unsplash.com/photo-1549078642-b2ba4bda23a3?w=120&q=80&auto=format&fit=crop';
    if (n.includes('pad') || n.includes('mousepad'))
      return 'https://images.unsplash.com/photo-1616499615519-3d49b447e559?w=120&q=80&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&q=80&auto=format&fit=crop';
  }
}
