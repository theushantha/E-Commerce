import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { CartItem } from '../../../shared/models/cart';

interface OrderAddress {
  fullName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface OrderTotals {
  subtotal?: number;
  shipping?: number;
  discount?: number;
  amount?: number;
}

interface LatestOrderDetails {
  confirmedAt?: string;
  paymentMethod?: string;
  address?: OrderAddress;
  items?: CartItem[];
  totals?: OrderTotals;
}

@Component({
  selector: 'app-checkout-order',
  imports: [CommonModule, RouterLink, MatButton],
  templateUrl: './checkout-order.component.html',
  styleUrl: './checkout-order.component.scss',
})
export class CheckoutOrderComponent {
  confirmedAt = new Date();
  paymentMethod = 'Card';
  address: OrderAddress | null = null;
  items: CartItem[] = [];
  subtotal = 0;
  shipping = 0;
  discount = 0;
  amount = 0;

  constructor() {
    const navState = (history.state ?? {}) as LatestOrderDetails;
    const saved = sessionStorage.getItem('latestOrderDetails');
    const savedState = saved ? (JSON.parse(saved) as LatestOrderDetails) : {};

    const data = this.hasMeaningfulData(navState) ? navState : savedState;

    if (data.confirmedAt) {
      this.confirmedAt = new Date(data.confirmedAt);
    }

    if (data.paymentMethod) {
      this.paymentMethod = data.paymentMethod;
    }

    this.address = data.address ?? null;
    this.items = data.items ?? [];
    this.subtotal = data.totals?.subtotal ?? 0;
    this.shipping = data.totals?.shipping ?? 0;
    this.discount = data.totals?.discount ?? 0;
    this.amount = data.totals?.amount ?? 0;
  }

  hasAddress(): boolean {
    return !!(
      this.address?.fullName ||
      this.address?.line1 ||
      this.address?.city ||
      this.address?.country
    );
  }

  hasOrder(): boolean {
    return this.items.length > 0 || this.amount > 0 || this.hasAddress();
  }

  private hasMeaningfulData(data: LatestOrderDetails): boolean {
    return !!(data?.items?.length || data?.totals?.amount || data?.address || data?.confirmedAt);
  }
}