import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  private baseUrl = 'http://online-sales-alb-1964549465.us-east-1.elb.amazonaws.com';

  constructor(private http: HttpClient, private router: Router) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): { id: number; name: string; email: string; role: string } | null {
    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : null;
  }

  getRole(): string {
    return this.getUser()?.role ?? 'client';
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  async login(email: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<{ access_token: string; user_id: number; name: string; role: string }>(
        `${this.baseUrl}/users/login`,
        { email, password }
      ).pipe(timeout(15000))
    );
    localStorage.setItem(this.tokenKey, result.access_token);
    localStorage.setItem(this.userKey, JSON.stringify({
      id: result.user_id,
      name: result.name,
      email,
      role: result.role ?? 'client',
    }));
  }

  async register(name: string, email: string, password: string, phone: string = ''): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/users/register`, { name, email, password, phone })
        .pipe(timeout(15000))
    );
  }

  async verifyAccount(email: string, code: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/users/verify`, { email, code })
        .pipe(timeout(15000))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/products']);
  }
}
