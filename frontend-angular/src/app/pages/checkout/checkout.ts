import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, PaymentResult } from '../../services/api';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class CheckoutComponent implements OnInit {
  cardNumber = '';
  cardholderName = '';
  expiryMonth = '';
  expiryYear = '';
  securityCode = '';
  result: PaymentResult | null = null;
  loading = false;
  error = '';
  cvvFocused = false;

  constructor(
    private api: ApiService,
    public cart: CartService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    await this.cart.load();
    this.cdr.markForCheck();
  }

  get formattedCard(): string {
    return this.cardNumber || '•••• •••• •••• ••••';
  }

  get formattedExpiry(): string {
    const m = this.expiryMonth || 'MM';
    const y = this.expiryYear || 'AA';
    return `${m}/${y}`;
  }

  formatCardNumber(event: Event) {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').slice(0, 16);
    v = v.replace(/(.{4})/g, '$1 ').trim();
    this.cardNumber = v;
  }

  getCardBrand(): string {
    const num = this.cardNumber.replace(/\s/g, '');
    if (num.startsWith('4')) return 'visa';
    if (num.startsWith('5')) return 'mastercard';
    return '';
  }

  getProductImage(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('notebook') || n.includes('laptop'))
      return 'https://picsum.photos/seed/laptop/80/80';
    if (n.includes('mouse'))
      return 'https://picsum.photos/seed/mouse/80/80';
    if (n.includes('monitor'))
      return 'https://picsum.photos/seed/monitor/80/80';
    if (n.includes('teclado'))
      return 'https://picsum.photos/seed/keyboard/80/80';
    if (n.includes('auricular') || n.includes('sony'))
      return 'https://picsum.photos/seed/headphones/80/80';
    if (n.includes('webcam'))
      return 'https://picsum.photos/seed/webcam/80/80';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://picsum.photos/seed/storage/80/80';
    if (n.includes('ram') || n.includes('corsair'))
      return 'https://picsum.photos/seed/memory/80/80';
    if (n.includes('silla'))
      return 'https://picsum.photos/seed/chair/80/80';
    return 'https://picsum.photos/seed/tech/80/80';
  }

  async pay() {
    if (!this.cardNumber.trim()) { this.error = 'Ingresa el número de tarjeta'; return; }
    if (!this.cardholderName.trim()) { this.error = 'Ingresa el nombre del titular'; return; }
    if (!this.expiryMonth || !this.expiryYear) { this.error = 'Ingresa la fecha de vencimiento'; return; }
    if (!this.securityCode.trim()) { this.error = 'Ingresa el CVV'; return; }

    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    try {
      this.result = await this.api.checkout(
        this.cardNumber.replace(/\s/g, ''),
        this.cardholderName,
        parseInt(this.expiryMonth),
        parseInt(this.expiryYear),
        this.securityCode,
      );
    } catch {
      this.error = 'Error al procesar el pago. Intenta nuevamente.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
