import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule],
  template: `
    <main class="auth-layout">
      <section class="story-panel">
        <a class="brand" routerLink="/login"><span class="brand-mark">cp</span><span>careerpilot<span class="brand-ai">.ai</span></span></a>
        <div class="story-copy">
          <span class="eyebrow light-eyebrow"><span class="sparkle">✦</span> YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>Make your next<br>career move your<br><em>best one yet.</em></h1>
          <p>A clearer path to the work you want. Bring your experience, find your next opportunity, and build the skills to get there.</p>
          <div class="story-note"><span class="note-icon">✦</span><span><strong>One thoughtful step at a time</strong><small>Your career journey, brought into focus.</small></span></div>
        </div>
        <div class="story-footer"><span>Designed for your next step</span><span>01 / 04</span></div>
      </section>
      <section class="form-panel">
        <div class="form-top"><span>Already have an account?</span><a [routerLink]="isRegister() ? '/login' : '/register'">{{ isRegister() ? 'Sign in' : 'Create an account' }} <span>↗</span></a></div>
        <div class="form-wrap">
          <span class="eyebrow">{{ isRegister() ? 'A GOOD PLACE TO BEGIN' : 'WELCOME BACK' }}</span>
          <h2>{{ isRegister() ? 'Create your account' : 'Let’s get you back in' }}</h2>
          <p class="form-intro">{{ isRegister() ? 'Set up your space and start shaping what comes next.' : 'Your next step is waiting right where you left it.' }}</p>
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            @if (isRegister()) {
              <label for="full_name">Your name</label>
              <input id="full_name" type="text" formControlName="full_name" placeholder="e.g. Alex Morgan" autocomplete="name">
              @if (form.controls.full_name.touched && form.controls.full_name.invalid) { <small class="field-error">Please enter your name.</small> }
            }
            <label for="email">Email address</label>
            <input id="email" type="email" formControlName="email" placeholder="you@example.com" autocomplete="email">
            @if (form.controls.email.touched && form.controls.email.invalid) { <small class="field-error">Enter a valid email address.</small> }
            <div class="password-label"><label for="password">Password</label></div>
            <input id="password" type="password" formControlName="password" placeholder="At least 10 characters" [attr.autocomplete]="isRegister() ? 'new-password' : 'current-password'">
            @if (form.controls.password.touched && form.controls.password.invalid) { <small class="field-error">Use at least 10 characters.</small> }
            @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }
            <button matButton="filled" class="submit-button" type="submit" [disabled]="loading()">{{ loading() ? 'Please wait…' : (isRegister() ? 'Create account' : 'Sign in') }} <span>→</span></button>
          </form>
          <div class="form-divider"><span></span><small>YOUR CAREER, WITH A LITTLE MORE CLARITY</small><span></span></div>
          <p class="terms">By continuing, you agree to our <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.</p>
        </div>
        <div class="form-bottom"><span>© 2026 CareerPilot AI</span><span>Built around your potential <b>✦</b></span></div>
      </section>
    </main>
  `
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly isRegister = signal(this.route.snapshot.data['mode'] === 'register');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(128)]]
  });

  submit(): void {
    // Adjust validators for login mode to ignore full_name requirement
    if (!this.isRegister()) {
      this.form.controls.full_name.setValidators([]);
      this.form.controls.full_name.updateValueAndValidity();
    }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const request = this.isRegister()
      ? this.auth.register(value.full_name.trim(), value.email.trim(), value.password)
      : this.auth.login(value.email.trim(), value.password);
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        if (this.isRegister()) {
          void this.router.navigateByUrl('/login');
        } else {
          void this.router.navigateByUrl('/dashboard');
        }
      },
      error: (err: unknown) => this.error.set(this.auth.messageFor(err))
    });
  }
}
