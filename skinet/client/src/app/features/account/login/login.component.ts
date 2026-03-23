import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatError } from '@angular/material/select';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AccountService } from '../../../core/services/account.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCard,
    MatFormField,
    MatInput,
    MatLabel,
    MatButton,
    MatError,
    MatProgressSpinner,
    MatCardHeader,
    MatCardContent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
  });

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all fields correctly');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formValue = this.loginForm.getRawValue();
    this.accountService.login({
      email: formValue.email?.trim(),
      password: formValue.password,
    }).subscribe({
      next: () => {
        // Check if there's a return URL stored
        const returnUrl = sessionStorage.getItem('returnUrl');
        sessionStorage.removeItem('returnUrl');
        this.router.navigateByUrl(returnUrl || '/shop');
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Login failed. Please check your credentials.');
      }
    });
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }
}
