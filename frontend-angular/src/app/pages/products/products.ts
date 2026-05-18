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
      await this.cart.add(product.id);
      this.addedId = product.id;
      this.cdr.markForCheck();
      setTimeout(() => { this.addedId = null; this.cdr.markForCheck(); }, 1800);
    } catch {}
  }

  getProductImage(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop'))
      return 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&q=80&auto=format&fit=crop';
    if (n.includes('mouse'))
      return 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80&auto=format&fit=crop';
    if (n.includes('monitor') || n.includes('pantalla'))
      return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&q=80&auto=format&fit=crop';
    if (n.includes('teclado') || n.includes('keyboard'))
      return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&q=80&auto=format&fit=crop';
    if (n.includes('auricular') || n.includes('headphone') || n.includes('sony'))
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80&auto=format&fit=crop';
    if (n.includes('webcam') || n.includes('camara'))
      return 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=500&q=80&auto=format&fit=crop';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.unsplash.com/photo-1597225244516-7b0b75d2e12a?w=500&q=80&auto=format&fit=crop';
    if (n.includes('ram') || n.includes('memoria') || n.includes('corsair'))
      return 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=500&q=80&auto=format&fit=crop';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://images.unsplash.com/photo-1549078642-b2ba4bda23a3?w=500&q=80&auto=format&fit=crop';
    if (n.includes('pad') || n.includes('mousepad'))
      return 'https://images.unsplash.com/photo-1616499615519-3d49b447e559?w=500&q=80&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80&auto=format&fit=crop';
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
