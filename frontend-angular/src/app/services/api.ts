import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://online-sales-alb-667999176.us-east-1.elb.amazonaws.com';

  constructor(private http: HttpClient) {}

  getProducts(): Promise<Product[]> {
    return firstValueFrom(this.http.get<Product[]>(`${this.baseUrl}/products/`));
  }

  getCart(): Promise<CartItem[]> {
    return firstValueFrom(this.http.get<CartItem[]>(`${this.baseUrl}/cart/`));
  }

  addToCart(productId: number, quantity = 1): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${this.baseUrl}/cart/add`, {
        product_id: productId,
        quantity,
      })
    );
  }

  removeFromCart(itemId: number): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.baseUrl}/cart/remove/${itemId}`)
    );
  }

  checkout(
    cardNumber: string,
    cardholderName: string,
    expiryMonth: number,
    expiryYear: number,
    securityCode: string,
  ): Promise<PaymentResult> {
    return firstValueFrom(
      this.http.post<PaymentResult>(`${this.baseUrl}/checkout/`, {
        card_number: cardNumber,
        cardholder_name: cardholderName,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        security_code: securityCode,
      })
    );
  }
}
