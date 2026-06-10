import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  phone = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  async submit() {
    if (!this.name || !this.email || !this.password) {
      this.error = 'Ingresa nombre, email y contraseña';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.auth.register(this.name, this.email, this.password, this.phone);
      this.router.navigate(['/verify'], { queryParams: { email: this.email } });
    } catch {
      this.error = 'Error al registrar. El email puede ya estar en uso.';
    } finally {
      this.loading = false;
    }
  }
}
