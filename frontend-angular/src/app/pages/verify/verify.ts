import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify.html',
  styleUrl: './verify.css',
})
export class VerifyComponent implements OnInit {
  email = '';
  code = '';
  error = '';
  success = '';
  loading = false;
  resending = false;
  resendCooldown = 0;
  private cooldownInterval?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      if (p['email']) this.email = p['email'];
    });
  }

  async submit() {
    if (!this.email || !this.code) {
      this.error = 'Ingresa tu email y el código de verificación';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.auth.verifyAccount(this.email, this.code);
      this.success = '¡Cuenta verificada! Redirigiendo al login...';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (err: any) {
      this.error = err?.error?.detail || 'Código incorrecto o expirado';
    } finally {
      this.loading = false;
    }
  }

  async resendCode() {
    if (!this.email || this.resending || this.resendCooldown > 0) {
      if (!this.email) this.error = 'Ingresa tu email para reenviar el código';
      return;
    }
    this.resending = true;
    this.error = '';
    this.success = '';
    try {
      await this.auth.resendCode(this.email);
      this.success = 'Código reenviado. Revisa tu correo.';
      this.startCooldown(30);
    } catch (err: any) {
      this.error = err?.error?.detail || 'No se pudo reenviar el código';
    } finally {
      this.resending = false;
    }
  }

  private startCooldown(seconds: number) {
    this.resendCooldown = seconds;
    clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.cooldownInterval);
    }, 1000);
  }
}
