import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { VerifyComponent } from './pages/verify/verify';
import { ProductsComponent } from './pages/products/products';
import { Cart } from './pages/cart/cart';
import { CheckoutComponent } from './pages/checkout/checkout';
import { FilesComponent } from './pages/files/files';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify', component: VerifyComponent },
  { path: 'products', component: ProductsComponent, canActivate: [authGuard] },
  { path: 'cart', component: Cart, canActivate: [authGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'files', component: FilesComponent, canActivate: [authGuard] },
];
