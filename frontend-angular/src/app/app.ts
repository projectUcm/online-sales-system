import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { CartDrawer } from './components/cart-drawer/cart-drawer';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, CartDrawer, CommonModule],
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  private router = inject(Router);
  private sub!: Subscription;
  showShell = true;

  ngOnInit() {
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = (e.urlAfterRedirects as string).split('?')[0];
        this.showShell = url !== '/admin/login' && !url.startsWith('/admin');
      });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
