import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

const HTTP_TIMEOUT = 15000;

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
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

export interface FileItem {
  name: string;
  size: number;
  last_modified: string;
  key: string;
}

export interface StorageInfo {
  files: FileItem[];
  storage_used: number;
  storage_available: number;
  storage_limit: number;
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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://online-sales-alb-1964549465.us-east-1.elb.amazonaws.com';

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

  getFiles(): Promise<StorageInfo> {
    return firstValueFrom(
      this.http.get<StorageInfo>(`${this.baseUrl}/files/`).pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  uploadFile(file: File, phone: string = ''): Promise<any> {
    const fd = new FormData();
    fd.append('file', file);
    if (phone) fd.append('phone', phone);
    return firstValueFrom(
      this.http.post(`${this.baseUrl}/files/upload`, fd).pipe(timeout(60000)),
    );
  }

  deleteFile(filename: string): Promise<any> {
    return firstValueFrom(
      this.http.delete(`${this.baseUrl}/files/${encodeURIComponent(filename)}`)
        .pipe(timeout(HTTP_TIMEOUT)),
    );
  }

  getDownloadUrl(filename: string): Promise<{ url: string }> {
    return firstValueFrom(
      this.http.get<{ url: string }>(`${this.baseUrl}/files/download/${encodeURIComponent(filename)}`)
        .pipe(timeout(HTTP_TIMEOUT)),
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
}
