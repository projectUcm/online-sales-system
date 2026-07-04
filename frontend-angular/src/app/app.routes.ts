import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { VerifyComponent } from './pages/verify/verify';
import { ProductsComponent } from './pages/products/products';
import { CheckoutComponent } from './pages/checkout/checkout';
import { AccountComponent } from './pages/account/account';
import { ProductDetailComponent } from './pages/product-detail/product-detail';
import { AdminLoginComponent } from './pages/admin-login/admin-login';
import { AdminComponent } from './pages/admin/admin';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify', component: VerifyComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'products/:id', component: ProductDetailComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'account', component: AccountComponent, canActivate: [authGuard] },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: 'products' },
];
