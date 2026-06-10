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
}
