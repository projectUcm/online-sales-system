import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { CartDrawer } from './components/cart-drawer/cart-drawer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, CartDrawer, CommonModule],
  templateUrl: './app.html',
})
export class App {
  private router = inject(Router);
  private hiddenPaths = ['/admin/login'];

  get showShell(): boolean {
    const url = this.router.url.split('?')[0];
    return !this.hiddenPaths.includes(url) && !url.startsWith('/admin');
  }
}
