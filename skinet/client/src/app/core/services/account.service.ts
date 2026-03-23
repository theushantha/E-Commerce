import { inject, Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Address, User } from '../../shared/models/user';
import { tap, switchMap } from 'rxjs';

export interface AuthResponse {
  user: User;
  token?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  currentUser = signal<User | null>(null);
  private tokenKey = 'jwt_token';

  isLoggedIn = computed(() => {
    return this.currentUser() !== null && this.getToken() !== null;
  });

  login(values: any) {
    // Using the framework's built-in /api/login endpoint via MapIdentityApi
    return this.http.post<any>(this.baseUrl + 'login', values).pipe(
      tap(response => {
        if (response.accessToken) {
          this.setToken(response.accessToken);
        }
      }),
      switchMap(() => this.getUserInfo())
    );
  }
  
  register(values: any) {
    const payload = {
      firstName: values.firstName?.trim() ?? '',
      lastName: values.lastName?.trim() ?? '',
      email: values.email?.trim() ?? '',
      password: values.password ?? '',
    };

    // Create account only; UI decides where to navigate next.
    return this.http.post<any>(this.baseUrl + 'account/register', payload);
  }
  
  getUserInfo() {
    return this.http.get<User>(this.baseUrl + 'account/user-info').pipe(
      tap(user => this.currentUser.set(user))
    );
  }

  logout() {
    return this.http.post(this.baseUrl + 'account/logout', {}).pipe(
      tap(() => {
        this.clearToken();
        this.currentUser.set(null);
      })
    );
  }

  updateAddress(address: Address) {
    return this.http.post(this.baseUrl + 'account/address', address);
  }

  // JWT Token Management
  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  hasToken(): boolean {
    return this.getToken() !== null;
  }
}
