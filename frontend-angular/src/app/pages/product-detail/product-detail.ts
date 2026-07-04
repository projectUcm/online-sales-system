import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, Product, Review } from '../../services/api';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth';
import { getProductImage as resolveProductImage, getProductCategory } from '../../utils/product-visuals';

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
    return resolveProductImage(name, 800);
  }

  getCategory(name: string): string {
    return getProductCategory(name);
  }
}
