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
      return 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=80&q=80&auto=format&fit=crop';
    if (n.includes('mouse'))
      return 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=80&q=80&auto=format&fit=crop';
    if (n.includes('monitor'))
      return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=80&q=80&auto=format&fit=crop';
    if (n.includes('teclado'))
      return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=80&q=80&auto=format&fit=crop';
    if (n.includes('auricular') || n.includes('sony'))
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&q=80&auto=format&fit=crop';
    if (n.includes('webcam'))
      return 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=80&q=80&auto=format&fit=crop';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.unsplash.com/photo-1597225244516-7b0b75d2e12a?w=80&q=80&auto=format&fit=crop';
    if (n.includes('ram') || n.includes('corsair'))
      return 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=80&q=80&auto=format&fit=crop';
    if (n.includes('silla'))
      return 'https://images.unsplash.com/photo-1549078642-b2ba4bda23a3?w=80&q=80&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=80&q=80&auto=format&fit=crop';
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
