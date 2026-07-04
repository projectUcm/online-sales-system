import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, Product } from '../../services/api';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { getProductImage, getProductCategory } from '../../utils/product-visuals';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
    return getProductImage(name);
  }

  getCategory(name: string): string {
    return getProductCategory(name);
  }
}
