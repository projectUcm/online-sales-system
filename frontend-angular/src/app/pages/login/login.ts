import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  async submit() {
    if (!this.email || !this.password) {
      this.error = 'Ingresa email y contraseña';
      return;
    }
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/products']);
    } catch {
      this.error = 'Credenciales incorrectas';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
