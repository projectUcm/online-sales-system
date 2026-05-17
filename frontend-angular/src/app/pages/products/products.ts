import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, Product } from '../../services/api';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products.html',
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  message = '';
  error = false;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    try {
      this.products = await this.api.getProducts();
    } catch {
      this.message = 'Error al cargar los productos';
      this.error = true;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async add(product: Product) {
    try {
      await this.api.addToCart(product.id);
      this.message = `${product.name} agregado al carrito`;
      this.error = false;
    } catch {
      this.message = 'Error al agregar al carrito';
      this.error = true;
    } finally {
      this.cdr.markForCheck();
    }
  }
}