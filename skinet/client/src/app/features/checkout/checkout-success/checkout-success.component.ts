import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';

interface ConfirmationAddress {
  fullName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface ConfirmationState {
  confirmedAt?: string;
  paymentMethod?: string;
  address?: ConfirmationAddress;
  amount?: number;
}

@Component({
  selector: 'app-checkout-success',
  imports: [CommonModule, RouterLink, MatButton],
  templateUrl: './checkout-success.component.html',
  styleUrl: './checkout-success.component.scss',
})
export class CheckoutSuccessComponent {
  confirmedAt = new Date();
  paymentMethod = 'Card';
  amount = 0;
  address: ConfirmationAddress | null = null;

  constructor() {
    const state = (history.state ?? {}) as ConfirmationState;

    if (state.confirmedAt) {
      this.confirmedAt = new Date(state.confirmedAt);
    }

    if (state.paymentMethod) {
      this.paymentMethod = state.paymentMethod;
    }

    if (typeof state.amount === 'number') {
      this.amount = state.amount;
    }

    if (state.address) {
      this.address = state.address;
    }
  }

  hasAddress(): boolean {
    return !!(
      this.address?.fullName ||
      this.address?.line1 ||
      this.address?.city ||
      this.address?.country
    );
  }
}