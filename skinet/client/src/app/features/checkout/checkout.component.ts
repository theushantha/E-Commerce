import { CommonModule, CurrencyPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { AccountService } from '../../core/services/account.service';
import { CartService } from '../../core/services/cart.service';
import { CheckoutService } from '../../core/services/checkout.service';
import { ShippingOption } from '../../shared/models/shipping';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-checkout',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    MatButton,
    MatCheckbox,
    MatFormField,
    MatLabel,
    MatInput,
    MatProgressSpinner,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private static googleMapsScriptPromise: Promise<void> | null = null;

  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private checkoutService = inject(CheckoutService);
  private router = inject(Router);

  @ViewChild('line1Input') line1Input?: ElementRef<HTMLInputElement>;

  cartService = inject(CartService);

  currentStep = signal(1);
  isSavingAddress = signal(false);
  isPreparingPayment = signal(false);
  isPaying = signal(false);
  paymentError = signal('');
  paymentSuccess = signal('');
  voucherMessage = signal('');
  discountRate = signal(0);
  
  billingInfo = signal<any>(null);
  paymentMethodInfo = signal('');
  selectedAddress = signal<any>(null);

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;
  private addressAutocomplete: any = null;
  private isViewReady = false;

  addressForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    country: ['', Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    saveAsDefault: [true],
  });

  voucherForm = this.fb.group({
    code: [''],
  });

  shippingOptions: ShippingOption[] = [
    { id: 1, name: 'UPS1', price: 10, description: 'Fastest delivery time' },
    { id: 2, name: 'UPS2', price: 5, description: 'Get it within 5 days' },
    { id: 3, name: 'UPS3', price: 2, description: 'Slower but cheap' },
    { id: 4, name: 'FREE', price: 0, description: 'Free! You get what you pay for' },
  ];

  shippingForm = this.fb.group({
    shippingMethod: [this.shippingOptions[0].id, Validators.required],
  });

  get subtotal(): number {
    return this.cartService.totals()?.subtotal ?? 0;
  }

  get shipping(): number {
    const selectedId = this.shippingForm.value.shippingMethod;
    const selected = this.shippingOptions.find((o) => o.id === selectedId);
    return selected?.price ?? 0;
  }

  get discount(): number {
    return this.subtotal * this.discountRate();
  }

  get total(): number {
    return this.subtotal + this.shipping - this.discount;
  }

  get hasClientSecret(): boolean {
    return !!this.cartService.cart()?.clientSecret;
  }

  selectShippingMethod(optionId: number): void {
    this.shippingForm.patchValue({ shippingMethod: optionId });
  }

  ngOnInit(): void {
    const user = this.accountService.currentUser();
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    if (user?.address) {
      this.addressForm.patchValue({
        fullName,
        country: user.address.country,
        line1: user.address.line1,
        line2: user.address.line2 ?? '',
        city: user.address.city,
        state: user.address.state,
        postalCode: user.address.postalCode,
      });
    } else if (fullName) {
      this.addressForm.patchValue({ fullName });
    }

    if (this.cartService.cart()?.id) {
      this.preparePaymentIntent();
    }
  }

  ngAfterViewInit(): void {
    this.isViewReady = true;
    this.mountPaymentElement();
    this.scheduleAddressAutocompleteInitialization();
  }

  ngOnDestroy(): void {
    if (this.paymentElement) {
      this.paymentElement.unmount();
      this.paymentElement = null;
    }

    if (this.addressAutocomplete && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(this.addressAutocomplete);
      this.addressAutocomplete = null;
    }
  }

  applyVoucher(): void {
    const code = (this.voucherForm.value.code ?? '').trim().toUpperCase();
    if (code === 'SAVE10') {
      this.discountRate.set(0.1);
      this.voucherMessage.set('10% Discount applied');
      return;
    }

    this.discountRate.set(0);
    this.voucherMessage.set(code ? 'Invalid voucher code' : 'Enter a voucher code');
  }

  goToStep(step: number): void {
    if (step < 1 || step > 4) return;
    this.currentStep.set(step);
    if (step === 1) {
      this.scheduleAddressAutocompleteInitialization();
    }
    if (step === 3) {
      this.mountPaymentElement();
    }
  }

  continueFromAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.isSavingAddress.set(true);
    const value = this.addressForm.getRawValue();
    
    // Store the address info for confirmation
    this.selectedAddress.set({
      fullName: value.fullName,
      line1: value.line1,
      line2: value.line2,
      city: value.city,
      state: value.state,
      country: value.country,
      postalCode: value.postalCode,
    });

    this.accountService
      .updateAddress({
        line1: value.line1 ?? '',
        line2: value.line2 ?? '',
        city: value.city ?? '',
        state: value.state ?? '',
        country: value.country ?? '',
        postalCode: value.postalCode ?? '',
      })
      .subscribe({
        next: () => {
          this.isSavingAddress.set(false);
          this.currentStep.set(2);
        },
        error: () => {
          this.isSavingAddress.set(false);
        },
      });
  }

  continueFromShipping(): void {
    this.currentStep.set(3);
    this.mountPaymentElement();
  }

  async submitPayment(): Promise<void> {
    this.paymentError.set('');
    this.paymentSuccess.set('');

    if (!this.stripe || !this.elements) {
      this.paymentError.set('Stripe is not ready yet. Please wait a moment and try again.');
      return;
    }

    // Move to confirmation step to review before final payment
    this.currentStep.set(4);
  }

  async completeOrder(): Promise<void> {
    this.paymentError.set('');
    this.paymentSuccess.set('');

    if (!this.stripe || !this.elements) {
      this.paymentError.set('Stripe is not ready yet. Please wait a moment and try again.');
      return;
    }

    this.isPaying.set(true);

    try {
      const result = await this.stripe.confirmPayment({
        elements: this.elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.href,
        },
      });

      if (result.error) {
        this.paymentError.set(result.error.message ?? 'Payment failed. Please try again.');
        return;
      }

      const status = (result as any)?.paymentIntent?.status as string | undefined;
      if (status && !['succeeded', 'processing', 'requires_capture'].includes(status)) {
        this.paymentError.set('Payment was not completed. Please check your details and try again.');
        return;
      }

      const paymentMethodType = (result as any)?.paymentIntent?.payment_method_types?.[0] as string | undefined;
      const confirmationAddress = this.selectedAddress() ?? this.addressForm.getRawValue();

      this.paymentSuccess.set('Payment successful. Your order is confirmed.');
      this.cartService.deleteCart();
      this.router.navigate(['/checkout/success'], {
        state: {
          confirmedAt: new Date().toISOString(),
          paymentMethod: this.getPaymentMethodLabel(paymentMethodType),
          address: confirmationAddress,
          amount: this.total,
        },
      });
    } catch (error: any) {
      this.paymentError.set(error?.message ?? 'Unable to complete payment. Please try again.');
    } finally {
      this.isPaying.set(false);
    }
  }

  backToShop(): void {
    this.router.navigateByUrl('/shop');
  }

  private preparePaymentIntent(): void {
    this.isPreparingPayment.set(true);
    this.checkoutService.createOrUpdatePaymentIntent().subscribe({
      next: () => {
        this.isPreparingPayment.set(false);
        this.mountPaymentElement();
      },
      error: (error) => {
        this.isPreparingPayment.set(false);
        this.paymentError.set(
          error?.error?.message || 'Unable to initialize payment. Please refresh and try again.'
        );
      },
    });
  }

  private async mountPaymentElement(): Promise<void> {
    if (!this.isViewReady || this.currentStep() < 3) return;
    if (!this.hasClientSecret) return;
    if (!environment.stripePublishableKey || environment.stripePublishableKey.includes('replace_with')) {
      this.paymentError.set('Stripe publishable key is not configured.');
      return;
    }

    const clientSecret = this.cartService.cart()?.clientSecret;
    if (!clientSecret) return;

    if (!this.stripe) {
      this.stripe = await loadStripe(environment.stripePublishableKey);
    }

    if (!this.stripe) {
      this.paymentError.set('Stripe failed to load.');
      return;
    }

    if (this.paymentElement) {
      this.paymentElement.unmount();
      this.paymentElement = null;
    }

    this.elements = this.stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#7d00fa',
        },
      },
    });

    this.paymentElement = this.elements.create('payment');
    this.paymentElement.mount('#payment-element');
  }

  private async initializeAddressAutocomplete(): Promise<void> {
    if (!environment.googleMapsApiKey || environment.googleMapsApiKey.includes('replace_with')) {
      return;
    }

    if (!this.line1Input?.nativeElement) return;

    if (this.addressAutocomplete && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(this.addressAutocomplete);
      this.addressAutocomplete = null;
    }

    try {
      await this.loadGoogleMapsScript();

      if (!window.google?.maps?.places) return;

      this.addressAutocomplete = new window.google.maps.places.Autocomplete(
        this.line1Input.nativeElement,
        {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
        }
      );

      this.addressAutocomplete.addListener('place_changed', () => {
        const place = this.addressAutocomplete.getPlace();
        const components = place?.address_components as Array<any> | undefined;
        if (!components?.length) return;

        const getPart = (type: string, mode: 'short_name' | 'long_name' = 'long_name') =>
          components.find((c) => c.types?.includes(type))?.[mode] ?? '';

        const streetNumber = getPart('street_number');
        const route = getPart('route');

        const line1 = [streetNumber, route].filter(Boolean).join(' ').trim();

        this.addressForm.patchValue({
          line1: line1 || place.formatted_address || this.addressForm.value.line1 || '',
          city: getPart('locality') || getPart('postal_town') || this.addressForm.value.city || '',
          state: getPart('administrative_area_level_1', 'short_name') || this.addressForm.value.state || '',
          postalCode: getPart('postal_code') || this.addressForm.value.postalCode || '',
          country: getPart('country') || this.addressForm.value.country || '',
        });
      });
    } catch {
      // Keep manual address entry as fallback when Places API is unavailable.
    }
  }

  private scheduleAddressAutocompleteInitialization(): void {
    setTimeout(() => {
      this.initializeAddressAutocomplete();
    });
  }

  private loadGoogleMapsScript(): Promise<void> {
    if (CheckoutComponent.googleMapsScriptPromise) {
      return CheckoutComponent.googleMapsScriptPromise;
    }

    CheckoutComponent.googleMapsScriptPromise = new Promise((resolve, reject) => {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });

    return CheckoutComponent.googleMapsScriptPromise;
  }

  private getPaymentMethodLabel(methodType?: string): string {
    if (!methodType) return 'Card';

    if (methodType === 'us_bank_account') return 'US bank account';

    return methodType
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

}
