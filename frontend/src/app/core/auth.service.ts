import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, UserProfile } from './auth.models';

const TOKEN_KEY = 'careerpilot_access_token';
const USER_KEY = 'careerpilot_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly profile = signal<UserProfile | null>(this.readUser());
  readonly user = this.profile.asReadonly();
  readonly isAuthenticated = computed(() => {
    const token = this.token();
    return this.profile() !== null && !!token && !this.isTokenExpired(token);
  });

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  token(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  isTokenExpired(token: string | null = this.token()): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      // atob decodes base64 string
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      // exp is in seconds, compare with Date.now() in ms (with 5 seconds buffer)
      return Date.now() >= (payload.exp * 1000 - 5000);
    } catch {
      return true;
    }
  }

  register(fullName: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/v1/auth/register', { full_name: fullName, email, password }).pipe(tap((response) => this.accept(response)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const body = new URLSearchParams({ username: email, password });
    return this.http.post<AuthResponse>('/api/v1/auth/login', body.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).pipe(tap((response) => this.accept(response)));
  }

  loadProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/v1/auth/me').pipe(tap((user) => this.saveUser(user)));
  }

  updateProfile(fullName: string): Observable<UserProfile> {
    return this.http.put<UserProfile>('/api/v1/auth/me', { full_name: fullName }).pipe(tap((user) => this.saveUser(user)));
  }

  logout(expired = false): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.profile.set(null);
    const extras = expired ? { queryParams: { expired: 'true' } } : undefined;
    void this.router.navigate(['/login'], extras);
  }

  messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Could not reach CareerPilot. Check that the API is running.';
      const detail = error.error?.detail;
      if (typeof detail === 'string') return detail;
    }
    return 'Something went wrong. Please try again.';
  }

  private accept(response: AuthResponse): void {
    sessionStorage.setItem(TOKEN_KEY, response.access_token);
    this.saveUser(response.user);
  }

  private saveUser(user: UserProfile): void {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    this.profile.set(user);
  }

  private readUser(): UserProfile | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as UserProfile; } catch { return null; }
  }
}
