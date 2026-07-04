import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

const HTTP_TIMEOUT = 15000;

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  avg_rating?: number | null;
  review_count?: number;
}

export interface Review {
  id: number;
  product_id: number;
  user_name: string;
  rating: number;
  comment: string;
  photo_url: string | null;
  created_at: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
}

export interface PaymentResult {
  status: string;
  transaction_id?: string;
  amount?: number;
  message?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  order_ref: string;
  total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export interface AdminStats {
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_clients: number;
}

export interface AuditEvent {
  id: string;
  created_at: string;
  event_type: string;
  user_email: string;
  description: string;
  ip_address: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://nexstore.sytes.net';

  constructor(private http: HttpClient) {}

  getProducts(): Promise<Product[]> {
    return firstValueFrom(
      this.http.get<Product[]>(`${this.baseUrl}/products/`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getCart(): Promise<CartItem[]> {
    return firstValueFrom(
      this.http.get<CartItem[]>(`${this.baseUrl}/cart/`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  addToCart(productId: number, quantity = 1): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${this.baseUrl}/cart/add`, {
        product_id: productId,
        quantity,
      }).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  removeFromCart(itemId: number): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.baseUrl}/cart/remove/${itemId}`)
        .pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  checkout(
    cardNumber: string,
    cardholderName: string,
    expiryMonth: number,
    expiryYear: number,
    securityCode: string,
    items: { product_id: number; quantity: number }[] = [],
  ): Promise<PaymentResult> {
    return firstValueFrom(
      this.http.post<PaymentResult>(`${this.baseUrl}/checkout/`, {
        card_number: cardNumber,
        cardholder_name: cardholderName,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        security_code: securityCode,
        items,
      }).pipe(timeout(30000)),
    );
  }

  getProduct(id: number): Promise<Product> {
    return firstValueFrom(
      this.http.get<Product>(`${this.baseUrl}/products/${id}`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getReviews(productId: number): Promise<Review[]> {
    return firstValueFrom(
      this.http.get<Review[]>(`${this.baseUrl}/products/${productId}/reviews`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  createReview(productId: number, rating: number, comment: string, photo: File | null): Promise<Review> {
    const fd = new FormData();
    fd.append('rating', String(rating));
    fd.append('comment', comment);
    if (photo) fd.append('photo', photo);
    return firstValueFrom(
      this.http.post<Review>(`${this.baseUrl}/products/${productId}/reviews`, fd).pipe(timeout(60000)),
    );
  }

  createProduct(name: string, price: number, stock: number): Promise<Product> {
    return firstValueFrom(
      this.http.post<Product>(`${this.baseUrl}/products/`, { name, price, stock })
        .pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  updateProduct(id: number, name: string, price: number, stock: number): Promise<Product> {
    return firstValueFrom(
      this.http.put<Product>(`${this.baseUrl}/products/${id}`, { name, price, stock })
        .pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  deleteProduct(id: number): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.baseUrl}/products/${id}`)
        .pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  guestCheckout(
    email: string,
    firstName: string,
    lastName: string,
    cardNumber: string,
    cardholderName: string,
    expiryMonth: number,
    expiryYear: number,
    securityCode: string,
    items: { product_id: number; quantity: number }[],
  ): Promise<PaymentResult> {
    return firstValueFrom(
      this.http.post<PaymentResult>(`${this.baseUrl}/checkout/guest`, {
        email,
        first_name: firstName,
        last_name: lastName,
        card_number: cardNumber,
        cardholder_name: cardholderName,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        security_code: securityCode,
        items,
      }).pipe(timeout(30000)),
    );
  }

  getMe(): Promise<{ id: number; name: string; email: string; phone: string; role: string }> {
    return firstValueFrom(
      this.http.get<any>(`${this.baseUrl}/users/me`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  updatePhone(phone: string): Promise<{ message: string; phone: string }> {
    return firstValueFrom(
      this.http.patch<{ message: string; phone: string }>(`${this.baseUrl}/users/me/phone`, { phone })
        .pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getMyOrders(): Promise<Order[]> {
    return firstValueFrom(
      this.http.get<Order[]>(`${this.baseUrl}/orders/my`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getAdminStats(): Promise<AdminStats> {
    return firstValueFrom(
      this.http.get<AdminStats>(`${this.baseUrl}/orders/stats`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getAllOrders(): Promise<any[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${this.baseUrl}/orders/all`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getAuditEvents(eventType: string = ''): Promise<AuditEvent[]> {
    const query = eventType ? `?event_type=${encodeURIComponent(eventType)}` : '';
    return firstValueFrom(
      this.http.get<AuditEvent[]>(`${this.baseUrl}/events/${query}`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getReviewStorage(): Promise<{ used_mb: number; limit_mb: number; available_bytes: number }> {
    return firstValueFrom(
      this.http.get<{ used_mb: number; limit_mb: number; available_bytes: number }>(`${this.baseUrl}/products/reviews/storage`)
        .pipe(timeout(HTTP_TIMEOUT)),
    );
  }
}
