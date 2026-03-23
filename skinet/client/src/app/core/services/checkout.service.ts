import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CartService } from './cart.service';
import { Cart } from '../../shared/models/cart';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private http = inject(HttpClient);
  private cartService = inject(CartService);
  private baseUrl = environment.apiUrl;

  createOrUpdatePaymentIntent() {
    const cartId = this.cartService.cart()?.id;
    if (!cartId) {
      throw new Error('No cart found for checkout.');
    }

    return this.http.post<Cart>(this.baseUrl + 'payments/' + cartId, {}).pipe(
      tap((updatedCart) => this.cartService.cart.set(updatedCart))
    );
  }
}
