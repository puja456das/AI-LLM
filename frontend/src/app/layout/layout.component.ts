import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="dashboard-shell">
      <aside class="sidebar">
        <a class="brand sidebar-brand" routerLink="/dashboard">
          <span class="brand-mark">cp</span>
          <span>careerpilot<span class="brand-ai">.ai</span></span>
        </a>
        <span class="nav-caption">WORKSPACE</span>
        <a class="nav-link" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
          <span>◫</span> Overview
        </a>
        <a class="nav-link" routerLink="/resume-analysis" routerLinkActive="active">
          <span>▤</span> Resume review
        </a>
        <a class="nav-link" routerLink="/jobs" routerLinkActive="active">
          <span>⌕</span> Job matches
        </a>
        <a class="nav-link" routerLink="/skills" routerLinkActive="active">
          <span>⌁</span> Skill plan
        </a>
        <a class="nav-link" routerLink="/interview" routerLinkActive="active">
          <span>◉</span> Interview practice
        </a>

        @if (isAdmin()) {
          <span class="nav-caption admin-caption">ADMINISTRATION</span>
          <a class="nav-link admin-nav-link" routerLink="/admin" routerLinkActive="active">
            <span>🛡️</span> Admin Console
          </a>
        }

        <div class="sidebar-bottom">
          <span class="nav-caption">ACCOUNT</span>
          <a class="nav-link" routerLink="/profile" routerLinkActive="active">
            <span>👤</span> Profile
          </a>
          <button class="logout" (click)="logout()">↪  Sign out</button>
        </div>
        <a class="user-chip" routerLink="/profile" title="View Profile">
          <span class="avatar" [class.admin-avatar]="isAdmin()">{{ initials() }}</span>
          <span>
            <strong>{{ name() }}</strong>
            <small>{{ isAdmin() ? 'Administrator' : email() }}</small>
          </span>
          <span class="dots">···</span>
        </a>
      </aside>
      <main class="dashboard-main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-caption {
      margin-top: 14px;
      color: #3b82f6 !important;
    }
    .admin-nav-link {
      color: #1e40af !important;
      background: #eff6ff !important;
      border: 1px solid #bfdbfe;
      margin-top: 4px;
    }
    .admin-nav-link.active {
      background: #183c61 !important;
      color: #fff !important;
    }
    .admin-avatar {
      background: #eff6ff !important;
      color: #1d4ed8 !important;
      border: 1px solid #93c5fd;
    }
  `]
})
export class LayoutComponent {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly name = computed(() => this.user()?.full_name ?? 'Career Explorer');
  readonly email = computed(() => this.user()?.email ?? '');
  readonly isAdmin = computed(() => !!this.user()?.is_admin);
  readonly initials = computed(() =>
    this.name()
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || (this.isAdmin() ? 'AD' : 'CP')
  );

  logout(): void {
    this.auth.logout();
  }
}
