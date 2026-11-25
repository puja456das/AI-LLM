import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminStats, CorporateJob, ToggleAdminResult, UserProfile } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>('/api/v1/admin/stats');
  }

  getUsers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>('/api/v1/admin/users');
  }

  toggleAdmin(userId: number): Observable<ToggleAdminResult> {
    return this.http.post<ToggleAdminResult>(`/api/v1/admin/users/${userId}/toggle-admin`, {});
  }

  getCorporateJobs(): Observable<CorporateJob[]> {
    return this.http.get<CorporateJob[]>('/api/v1/admin/jobs');
  }

  createCorporateJob(job: {
    title: string;
    company: string;
    location: string;
    salary_range: string;
    required_skills: string;
    description: string;
  }): Observable<CorporateJob> {
    return this.http.post<CorporateJob>('/api/v1/admin/jobs', job);
  }

  deleteCorporateJob(jobId: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/jobs/${jobId}`);
  }

  getPublicCorporateOpenings(): Observable<CorporateJob[]> {
    return this.http.get<CorporateJob[]>('/api/v1/admin/corporate-openings');
  }
}
