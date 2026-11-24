import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard-shell">
      <aside class="sidebar">
        <a class="brand sidebar-brand" routerLink="/dashboard"><span class="brand-mark">cp</span><span>careerpilot<span class="brand-ai">.ai</span></span></a>
        <span class="nav-caption">WORKSPACE</span>
        <a class="nav-link active" routerLink="/dashboard"><span>◫</span> Overview</a>
        <a class="nav-link" routerLink="/resume-analysis"><span>▤</span> Resume review</a>
        <a class="nav-link muted" routerLink="/jobs"><span>⌕</span> Job matches <i>SOON</i></a>
        <a class="nav-link muted" routerLink="/skills"><span>⌁</span> Skill plan <i>SOON</i></a>
        <a class="nav-link muted" routerLink="/interview"><span>◉</span> Interview practice <i>SOON</i></a>
        <div class="sidebar-bottom"><span class="nav-caption">ACCOUNT</span><a class="nav-link muted" href="#profile"><span>◉</span> Profile</a><button class="logout" (click)="logout()">↪ &nbsp; Sign out</button></div>
        <div class="user-chip"><span class="avatar">{{ initials() }}</span><span><strong>{{ name() }}</strong><small>{{ email() }}</small></span><span class="dots">···</span></div>
      </aside>
      <main class="dashboard-main">
        <header class="dash-header"><div><span class="eyebrow">MONDAY, YOUR NEXT STEP AWAITS</span><h1>A little progress goes a long way.</h1></div><span class="header-date">CAREERPILOT / 01</span></header>
        <section class="welcome-card"><div><span class="eyebrow light-eyebrow">YOUR CAREER, IN MOTION</span><h2>Good to have you here, {{ firstName() }}.</h2><p>Your next opportunity starts with a clearer picture of where you are. Let’s take that first step together.</p><a href="#resume" class="welcome-action">Start with your resume <span>→</span></a></div><div class="welcome-art"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="orbit-core">✦</span><span class="orbit-label">YOUR NEXT<br>CHAPTER</span></div></section>
        <section class="section-heading"><div><span class="eyebrow">YOUR WORKSPACE</span><h2>Make it yours</h2></div><span class="quiet-label">YOUR JOURNEY STARTS HERE</span></section>
        <section class="feature-grid">
          <article class="feature-card"><div class="feature-top"><span class="feature-icon blue">▤</span><span class="status-tag">A GOOD FIRST STEP</span></div><h3>See your resume<br>with fresh eyes.</h3><p>Get a thoughtful read on your experience and where it could take you.</p><a routerLink="/resume-analysis">Explore resume review <span>↗</span></a><span class="card-index">01</span></article>
          <article class="feature-card"><div class="feature-top"><span class="feature-icon peach">⌕</span><span class="status-tag">FIND YOUR FIT</span></div><h3>Find work that<br>feels like you.</h3><p>Discover roles that bring your strengths and ambitions together.</p><a href="#jobs">Explore job matches <span>↗</span></a><span class="card-index">02</span></article>
          <article class="feature-card"><div class="feature-top"><span class="feature-icon sage">⌁</span><span class="status-tag">GROW WITH PURPOSE</span></div><h3>Build what comes<br>next.</h3><p>Turn the skills you want into a practical plan you can follow.</p><a href="#skills">Explore your skill plan <span>↗</span></a><span class="card-index">03</span></article>
        </section>
        <footer class="dashboard-footer"><span>Built around your potential <b>✦</b></span><span>SMALL STEPS. MEANINGFUL MOMENTUM.</span></footer>
      </main>
    </div>
  `
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  readonly name = signal(this.auth.user()?.full_name ?? 'Career Explorer');
  readonly email = signal(this.auth.user()?.email ?? '');
  readonly firstName = signal(this.name().split(' ')[0]);
  readonly initials = signal(this.name().split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase());
  logout(): void { this.auth.logout(); }
}
