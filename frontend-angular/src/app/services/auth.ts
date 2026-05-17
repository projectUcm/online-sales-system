import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  private baseUrl = 'http://online-sales-alb-667999176.us-east-1.elb.amazonaws.com';

  constructor(private http: HttpClient, private router: Router) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  async login(email: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<{ access_token: string }>(`${this.baseUrl}/users/login`, { email, password })
    );
    localStorage.setItem(this.tokenKey, result.access_token);
  }

  async register(email: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/users/register`, { email, password })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }
}
