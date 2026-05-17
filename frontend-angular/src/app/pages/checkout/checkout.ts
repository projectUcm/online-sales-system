import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, PaymentResult } from '../../services/api';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class CheckoutComponent {
  cardNumber = '';
  cardholderName = '';
  expiryMonth = '';
  expiryYear = '';
  securityCode = '';
  result: PaymentResult | null = null;
  loading = false;
  error = '';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  async pay() {
    if (!this.cardNumber.trim()) {
      this.error = 'Ingresa el número de tarjeta';
      return;
    }
    if (!this.cardholderName.trim()) {
      this.error = 'Ingresa el nombre del titular';
      return;
    }
    if (!this.expiryMonth || !this.expiryYear) {
      this.error = 'Ingresa la fecha de vencimiento';
      return;
    }
    if (!this.securityCode.trim()) {
      this.error = 'Ingresa el CVV';
      return;
    }
    this.loading = true;
    this.error = '';
    this.result = null;
    try {
      this.result = await this.api.checkout(
        this.cardNumber.replace(/\s/g, ''),
        this.cardholderName,
        parseInt(this.expiryMonth),
        parseInt(this.expiryYear),
        this.securityCode,
      );
    } catch {
      this.error = 'Error al procesar el pago';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
