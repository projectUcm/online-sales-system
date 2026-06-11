import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Product } from '../../services/api';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  addedId: number | null = null;
  loadError = false;

  constructor(
    private api: ApiService,
    public cart: CartService,
    public drawer: CartDrawerService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    try {
      this.products = await this.api.getProducts();
    } catch {
      this.loadError = true;
    } finally {
      await this.cart.load();
      this.cdr.markForCheck();
    }
  }

  async add(product: Product) {
    try {
      await this.cart.add(product.id, { name: product.name, price: product.price });
      this.addedId = product.id;
      this.cdr.markForCheck();
      setTimeout(() => { this.addedId = null; this.cdr.markForCheck(); }, 1800);
    } catch {}
  }

  getProductImage(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop'))
      return 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('mouse'))
      return 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('monitor') || n.includes('pantalla'))
      return 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('teclado') || n.includes('keyboard'))
      return 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('auricular') || n.includes('headphone') || n.includes('sony'))
      return 'https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('webcam') || n.includes('camara'))
      return 'https://images.pexels.com/photos/4160016/pexels-photo-4160016.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.pexels.com/photos/117729/pexels-photo-117729.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('ram') || n.includes('memoria') || n.includes('corsair'))
      return 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=500';
    if (n.includes('pad') || n.includes('mousepad'))
      return 'https://images.pexels.com/photos/3587241/pexels-photo-3587241.jpeg?auto=compress&cs=tinysrgb&w=500';
    return 'https://images.pexels.com/photos/325153/pexels-photo-325153.jpeg?auto=compress&cs=tinysrgb&w=500';
  }

  getCategory(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop')) return 'Laptops';
    if (n.includes('mouse')) return 'Periféricos';
    if (n.includes('monitor')) return 'Monitores';
    if (n.includes('teclado') || n.includes('keyboard')) return 'Periféricos';
    if (n.includes('auricular') || n.includes('headphone')) return 'Audio';
    if (n.includes('webcam')) return 'Video';
    if (n.includes('ssd') || n.includes('ram') || n.includes('memoria')) return 'Almacenamiento';
    if (n.includes('silla')) return 'Mobiliario';
    if (n.includes('pad')) return 'Accesorios';
    return 'Tecnología';
  }
}
