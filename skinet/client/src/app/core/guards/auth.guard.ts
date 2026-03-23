import { Injectable, inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AccountService } from '../services/account.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const accountService = inject(AccountService);
  const router = inject(Router);

  if (accountService.hasToken() && accountService.currentUser()) {
    return true;
  }

  // Store the intended URL for redirecting after login
  sessionStorage.setItem('returnUrl', state.url);
  
  router.navigate(['/account/login']);
  return false;
};
