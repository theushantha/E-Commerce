import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatError } from '@angular/material/select';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AccountService } from '../../../core/services/account.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly namePattern = /^[A-Za-z][A-Za-z' -]*$/;

  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  successMessage = signal('');

  registerForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(this.namePattern)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(this.namePattern)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100), this.passwordStrengthValidator]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  // Custom validator for password strength
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}\|<>]/.test(password);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    return !passwordValid ? { passwordStrength: true } : null;
  }

  // Validator to check if passwords match
  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all fields correctly');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { confirmPassword, ...registerData } = this.registerForm.value;

    this.accountService.register(registerData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Registration successful! Redirecting to login...');
        setTimeout(() => {
          this.router.navigateByUrl('/account/login');
        }, 1500);
      },
      error: (error) => {
        this.isLoading.set(false);
        const validationErrors = error.error?.errors;

        let firstValidationMessage: string | null = null;
        if (Array.isArray(validationErrors)) {
          firstValidationMessage = validationErrors[0] ?? null;
        } else if (validationErrors && typeof validationErrors === 'object') {
          firstValidationMessage = Object.values(validationErrors).flat()[0] as string;
        }

        this.errorMessage.set(
          error.error?.message || firstValidationMessage || 'Registration failed. Please try again.'
        );
      }
    });
  }

  togglePasswordVisibility() {
    this.hidePassword.set(!this.hidePassword());
  }

  toggleConfirmPasswordVisibility() {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  getPasswordStrengthHint(): string {
    const password = this.registerForm.get('password')?.value;
    if (!password) return '';

    const hints: string[] = [];
    if (!/[A-Z]/.test(password)) hints.push('uppercase letter');
    if (!/[a-z]/.test(password)) hints.push('lowercase letter');
    if (!/[0-9]/.test(password)) hints.push('number');
    if (!/[!@#$%^&*(),.?":{}\|<>]/.test(password)) hints.push('special character');

    return hints.length > 0 ? `Missing: ${hints.join(', ')}` : 'Strong password!';
  }
}
