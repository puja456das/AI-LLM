import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="dashboard-shell">
      <aside class="sidebar">
        <a class="brand sidebar-brand" routerLink="/dashboard">
          <span class="brand-mark">cp</span>
          <span>careerpilot<span class="brand-ai">.ai</span></span>
        </a>
        <span class="nav-caption">WORKSPACE</span>
        <a class="nav-link" routerLink="/dashboard"><span>◫</span> Overview</a>
        <a class="nav-link" routerLink="/resume-analysis"><span>▤</span> Resume review</a>
        <a class="nav-link muted" routerLink="/jobs"><span>⌕</span> Job matches <i>SOON</i></a>
        <a class="nav-link muted" routerLink="/skills"><span>⌁</span> Skill plan <i>SOON</i></a>
        <a class="nav-link muted" routerLink="/interview"><span>◉</span> Interview practice <i>SOON</i></a>
        <div class="sidebar-bottom">
          <span class="nav-caption">ACCOUNT</span>
          <a class="nav-link muted" routerLink="/profile"><span>◉</span> Profile</a>
          <button class="logout" (click)="logout()">↪  Sign out</button>
        </div>
        <div class="user-chip">
          <span class="avatar">{{ initials }}</span>
          <span><strong>{{ name }}</strong><small>{{ email }}</small></span>
          <span class="dots">···</span>
        </div>
      </aside>
      <main class="dashboard-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class LayoutComponent {
  private readonly auth = inject(AuthService);
  readonly name: string;
  readonly email: string;
  readonly initials: string;

  constructor() {
    const user = this.auth.user();
    this.name = user?.full_name ?? 'Career Explorer';
    this.email = user?.email ?? '';
    this.initials = this.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  logout(): void { this.auth.logout(); }
}
