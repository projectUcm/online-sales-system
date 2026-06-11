import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    if (!this.email || !this.password) { this.error = 'Completa todos los campos'; return; }
    this.loading = true;
    this.error = '';
    try {
      await this.auth.login(this.email, this.password);
      if (!this.auth.isAdmin()) {
        this.auth.logout();
        this.error = 'Esta cuenta no tiene permisos de administrador.';
        return;
      }
      this.router.navigate(['/admin']);
    } catch {
      this.error = 'Credenciales incorrectas.';
    } finally {
      this.loading = false;
    }
  }

  goBack() { this.router.navigate(['/']); }
}
