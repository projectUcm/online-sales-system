import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { LandingComponent } from './pages/landing/landing';
import { EnterComponent } from './pages/enter/enter';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { VerifyComponent } from './pages/verify/verify';
import { ProductsComponent } from './pages/products/products';
import { Cart } from './pages/cart/cart';
import { CheckoutComponent } from './pages/checkout/checkout';
import { FilesComponent } from './pages/files/files';
import { AdminLoginComponent } from './pages/admin-login/admin-login';
import { AdminComponent } from './pages/admin/admin';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'enter', component: EnterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify', component: VerifyComponent },
  { path: 'products', component: ProductsComponent, canActivate: [authGuard] },
  { path: 'cart', component: Cart, canActivate: [authGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'files', component: FilesComponent, canActivate: [authGuard] },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' },
];
