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
      return 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('mouse'))
      return 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('monitor') || n.includes('pantalla'))
      return 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('teclado') || n.includes('keyboard'))
      return 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('auricular') || n.includes('headphone') || n.includes('sony'))
      return 'https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('webcam') || n.includes('camara'))
      return 'https://images.pexels.com/photos/4160016/pexels-photo-4160016.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.pexels.com/photos/117729/pexels-photo-117729.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('ram') || n.includes('memoria') || n.includes('corsair'))
      return 'https://images.pexels.com/photos/163125/pexels-photo-163125.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=120';
    if (n.includes('pad') || n.includes('mousepad'))
      return 'https://images.pexels.com/photos/3587241/pexels-photo-3587241.jpeg?auto=compress&cs=tinysrgb&w=120';
    return 'https://images.pexels.com/photos/325153/pexels-photo-325153.jpeg?auto=compress&cs=tinysrgb&w=120';
  }
}
