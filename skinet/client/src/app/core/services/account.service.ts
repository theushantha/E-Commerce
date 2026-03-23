import { inject, Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Address, User } from '../../shared/models/user';
import { tap } from 'rxjs';

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
    let params = new HttpParams();
    params = params.append('useCookies', true);

    return this.http.post<AuthResponse>(this.baseUrl + 'login', values, {params}).pipe(
      tap(response => {
        if (response.token) {
          this.setToken(response.token);
        }
        this.currentUser.set(response.user);
      })
    );
  }
  
  register(values: any) {
    return this.http.post<AuthResponse>(this.baseUrl + 'account/register', values).pipe(
      tap(response => {
        if (response.token) {
          this.setToken(response.token);
        }
        this.currentUser.set(response.user);
      })
    );
  }
  
  getUserInfo() {
    return this.http.get<User>(this.baseUrl + 'account/user-info').subscribe({
      next: (user) => this.currentUser.set(user)
    });
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
