import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';

export const routes: Routes = [
  // Auth pages (no layout)
  { path: 'login', loadComponent: () => import('./features/auth/auth-page.component').then(m => m.AuthPageComponent), data: { mode: 'login' } },
  { path: 'register', loadComponent: () => import('./features/auth/auth-page.component').then(m => m.AuthPageComponent), data: { mode: 'register' } },

  // All other pages share the layout with sidebar
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'resume-analysis', loadComponent: () => import('./features/resume-analysis/resume-analysis.component').then(m => m.ResumeAnalysisComponent) },
      { path: 'jobs', loadComponent: () => import('./features/jobs/jobs.component').then(m => m.JobsComponent) },
      { path: 'skills', loadComponent: () => import('./features/skills/skills.component').then(m => m.SkillsComponent) },
      { path: 'interview', loadComponent: () => import('./features/interview/interview.component').then(m => m.InterviewComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
