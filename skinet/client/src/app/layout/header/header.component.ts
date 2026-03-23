import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbar } from '@angular/material/toolbar';
import { MatBadge } from '@angular/material/badge';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { BusyService } from '../../core/services/busy.service';
import { MatProgressBar } from '@angular/material/progress-bar';
import { CartService } from '../../core/services/cart.service';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    MatToolbar,
    MatIcon,
    MatButton,
    MatBadge,
    MatMenu,
    MatMenuTrigger,
    MatDivider,
    RouterLink,
    RouterLinkActive,
    MatProgressBar
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  busyService = inject(BusyService);
  cartService = inject(CartService);
  accountService = inject(AccountService);
  private router = inject(Router);

  onLogout() {
    this.accountService.logout().subscribe({
      next: () => {
        this.router.navigateByUrl('/');
      }
    });
  }
}
