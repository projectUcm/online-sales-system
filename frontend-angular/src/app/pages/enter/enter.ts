import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-enter',
  standalone: true,
  templateUrl: './enter.html',
  styleUrl: './enter.css',
})
export class EnterComponent {
  constructor(private router: Router) {}

  goClient()  { this.router.navigate(['/login']); }
  goAdmin()   { this.router.navigate(['/admin/login']); }
  goBack()    { this.router.navigate(['/']); }
}
