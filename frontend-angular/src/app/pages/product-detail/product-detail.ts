import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, Product, Review } from '../../services/api';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  reviews: Review[] = [];
  loading = true;
  notFound = false;
  added = false;

  reviewRating = 5;
  reviewComment = '';
  reviewPhoto: File | null = null;
  reviewPhotoPreview: string | null = null;
  submittingReview = false;
  reviewError = '';
  reviewSuccess = '';

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public cart: CartService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const [product, reviews] = await Promise.all([
        this.api.getProduct(id),
        this.api.getReviews(id),
      ]);
      this.product = product;
      this.reviews = reviews;
    } catch {
      this.notFound = true;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async addToCart() {
    if (!this.product) return;
    try {
      await this.cart.add(this.product.id, { name: this.product.name, price: this.product.price });
      this.added = true;
      this.cdr.markForCheck();
      setTimeout(() => { this.added = false; this.cdr.markForCheck(); }, 1800);
    } catch {}
  }

  onPhotoSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.reviewPhoto = file;
    this.reviewPhotoPreview = file ? URL.createObjectURL(file) : null;
  }

  clearPhoto() {
    this.reviewPhoto = null;
    this.reviewPhotoPreview = null;
  }

  async submitReview() {
    if (!this.product) return;
    this.reviewError = '';
    this.reviewSuccess = '';
    this.submittingReview = true;
    try {
      const review = await this.api.createReview(
        this.product.id, this.reviewRating, this.reviewComment.trim(), this.reviewPhoto,
      );
      this.reviews.unshift(review);
      this.reviewComment = '';
      this.reviewRating = 5;
      this.clearPhoto();
      this.reviewSuccess = '¡Gracias por tu reseña!';
      this.recalculateRating();
    } catch (err: any) {
      this.reviewError = err?.error?.detail || 'No se pudo enviar la reseña';
    } finally {
      this.submittingReview = false;
      this.cdr.markForCheck();
    }
  }

  private recalculateRating() {
    if (!this.product) return;
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.product.review_count = this.reviews.length;
    this.product.avg_rating = Math.round((total / this.reviews.length) * 10) / 10;
  }

  stars(n: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < Math.round(n) ? 1 : 0));
  }

  getProductImage(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop'))
      return 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('mouse'))
      return 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('monitor') || n.includes('pantalla'))
      return 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('teclado') || n.includes('keyboard'))
      return 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('auricular') || n.includes('headphone') || n.includes('sony'))
      return 'https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('webcam') || n.includes('camara'))
      return 'https://images.pexels.com/photos/4160016/pexels-photo-4160016.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.pexels.com/photos/117729/pexels-photo-117729.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('ram') || n.includes('memoria') || n.includes('corsair'))
      return 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('silla') || n.includes('chair'))
      return 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=800';
    if (n.includes('pad') || n.includes('mousepad'))
      return 'https://images.pexels.com/photos/3587241/pexels-photo-3587241.jpeg?auto=compress&cs=tinysrgb&w=800';
    return 'https://images.pexels.com/photos/325153/pexels-photo-325153.jpeg?auto=compress&cs=tinysrgb&w=800';
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
