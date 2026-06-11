import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService, PaymentResult } from '../../services/api';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth';

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
  guestEmail = '';
  guestFirstName = '';
  guestLastName = '';
  result: PaymentResult | null = null;
  loading = false;
  error = '';
  cvvFocused = false;

  constructor(
    private api: ApiService,
    public cart: CartService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    await this.cart.load();
    this.cdr.markForCheck();
  }

  get isGuest(): boolean { return !this.auth.isLoggedIn(); }

  get formattedCard(): string { return this.cardNumber || '•••• •••• •••• ••••'; }
  get formattedExpiry(): string {
    return `${this.expiryMonth || 'MM'}/${this.expiryYear || 'AA'}`;
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
      return 'https://images.pexels.com/photos/1229861/pexels-photo-1229861.jpeg?auto=compress&cs=tinysrgb&w=80';
    if (n.includes('mouse'))
      return 'https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=80';
    if (n.includes('monitor'))
      return 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=80';
    if (n.includes('teclado'))
      return 'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=80';
    if (n.includes('auricular') || n.includes('sony'))
      return 'https://images.pexels.com/photos/577769/pexels-photo-577769.jpeg?auto=compress&cs=tinysrgb&w=80';
    if (n.includes('ssd') || n.includes('disco'))
      return 'https://images.pexels.com/photos/117729/pexels-photo-117729.jpeg?auto=compress&cs=tinysrgb&w=80';
    if (n.includes('ram') || n.includes('corsair'))
      return 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=80';
    if (n.includes('silla'))
      return 'https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?auto=compress&cs=tinysrgb&w=80';
    return 'https://images.pexels.com/photos/325153/pexels-photo-325153.jpeg?auto=compress&cs=tinysrgb&w=80';
  }

  async pay() {
    const items = this.cart.items().map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    if (items.length === 0) { this.error = 'Tu carrito está vacío. Agrega productos antes de continuar.'; return; }
    if (this.isGuest && !this.guestFirstName.trim()) { this.error = 'Ingresa tu nombre'; return; }
    if (this.isGuest && !this.guestLastName.trim()) { this.error = 'Ingresa tu apellido'; return; }
    if (this.isGuest && !this.guestEmail.trim()) { this.error = 'Ingresa tu correo para recibir la confirmación'; return; }
    if (!this.cardNumber.trim()) { this.error = 'Ingresa el número de tarjeta'; return; }
    if (!this.cardholderName.trim()) { this.error = 'Ingresa el nombre del titular'; return; }
    if (!this.expiryMonth || !this.expiryYear) { this.error = 'Ingresa la fecha de vencimiento'; return; }
    if (!this.securityCode.trim()) { this.error = 'Ingresa el CVV'; return; }

    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    const cardNum = this.cardNumber.replace(/\s/g, '');
    const month = parseInt(this.expiryMonth);
    const year = parseInt(this.expiryYear);

    try {
      if (this.isGuest) {
        this.result = await this.api.guestCheckout(
          this.guestEmail, this.guestFirstName, this.guestLastName,
          cardNum, this.cardholderName, month, year, this.securityCode, items,
        );
        if (this.result?.status === 'approved') this.cart.clearGuest();
      } else {
        this.result = await this.api.checkout(
          cardNum, this.cardholderName, month, year, this.securityCode, items,
        );
        if (this.result?.status === 'approved') {
          this.cart.clearGuest();
          this.cart.items.set([]);
        }
      }
    } catch {
      this.error = 'Error al procesar el pago. Intenta nuevamente.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
