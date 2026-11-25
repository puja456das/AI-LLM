import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { AuthService } from '../../core/auth.service';
import { AdminStats, CorporateJob, UserProfile } from '../../core/auth.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-shell">
      <div class="page-header">
        <div>
          <span class="eyebrow">ADMINISTRATOR CONTROL PANEL · PLATFORM TELEMETRY</span>
          <h1>Platform Administration & Corporate Job Portal</h1>
          <p class="subtitle">
            Monitor candidate metrics, manage user role permissions, and publish corporate job openings.
          </p>
        </div>
        <div class="admin-badge">
          <span class="admin-shield">🛡️</span>
          <span>Logged in as <strong>{{ currentAdminName() }}</strong></span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="admin-tabs">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'telemetry'"
          (click)="activeTab.set('telemetry')"
        >
          <span>📊 Platform Telemetry</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'users'"
          (click)="activeTab.set('users')"
        >
          <span>👥 User Management</span>
          <span class="tab-count">{{ users().length }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'jobs'"
          (click)="activeTab.set('jobs')"
        >
          <span>🏢 Corporate Job Openings</span>
          <span class="tab-count highlight">{{ corporateJobs().length }}</span>
        </button>
      </div>

      @if (alertMessage()) {
        <div class="status-banner" [class.success]="alertSuccess()" [class.error]="!alertSuccess()">
          <span>{{ alertSuccess() ? '✓' : '!' }}</span>
          <span>{{ alertMessage() }}</span>
          <button (click)="alertMessage.set('')" class="close-alert-btn">✕</button>
        </div>
      }

      <!-- TAB 1: TELEMETRY & METRICS -->
      @if (activeTab() === 'telemetry') {
        <div class="telemetry-grid">
          <div class="stat-box">
            <span class="stat-label">REGISTERED USERS</span>
            <span class="stat-num">{{ stats()?.total_users ?? users().length }}</span>
            <small class="stat-sub">Active candidates & admins</small>
          </div>
          <div class="stat-box">
            <span class="stat-label">CORPORATE JOB POSTINGS</span>
            <span class="stat-num highlight">{{ stats()?.total_corporate_jobs ?? corporateJobs().length }}</span>
            <small class="stat-sub">Active employer listings</small>
          </div>
          <div class="stat-box">
            <span class="stat-label">O*NET OCCUPATION PROFILES</span>
            <span class="stat-num">{{ stats()?.model_profiles_count ?? 923 }}</span>
            <small class="stat-sub">U.S. Dept. of Labor catalogue</small>
          </div>
          <div class="stat-box">
            <span class="stat-label">ML INFERENCE ENGINE</span>
            <span class="stat-status-online">
              <span class="pulse-dot"></span> Online
            </span>
            <small class="stat-sub">{{ stats()?.model_status ?? 'TF-IDF + Cosine Similarity' }}</small>
          </div>
        </div>

        <div class="recent-users-card">
          <div class="card-heading">
            <h3>Recent User Registrations</h3>
            <button class="small-refresh-btn" (click)="loadAllData()">↻ Refresh</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                @for (u of stats()?.recent_users ?? users().slice(0, 5); track u.id) {
                  <tr>
                    <td>#{{ u.id }}</td>
                    <td><strong>{{ u.full_name }}</strong></td>
                    <td>{{ u.email }}</td>
                    <td>
                      <span class="role-pill" [class.admin]="u.is_admin">
                        {{ u.is_admin ? 'Administrator' : 'Candidate' }}
                      </span>
                    </td>
                    <td>{{ u.created_at | date:'mediumDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- TAB 2: USER MANAGEMENT -->
      @if (activeTab() === 'users') {
        <div class="users-card">
          <div class="card-heading">
            <div>
              <h3>Registered Candidate & Admin Directory</h3>
              <p>Promote or demote users to grant or revoke administrative access.</p>
            </div>
            <div class="user-search-box">
              <span>⌕</span>
              <input
                type="text"
                [(ngModel)]="userSearchQuery"
                placeholder="Search by name or email..."
              />
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Candidate Name</th>
                  <th>Email Address</th>
                  <th>Role Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (u of filteredUsers(); track u.id) {
                  <tr>
                    <td>#{{ u.id }}</td>
                    <td><strong>{{ u.full_name }}</strong></td>
                    <td>{{ u.email }}</td>
                    <td>
                      <span class="role-pill" [class.admin]="u.is_admin">
                        {{ u.is_admin ? '🛡️ Administrator' : 'Candidate' }}
                      </span>
                    </td>
                    <td>{{ u.created_at | date:'mediumDate' }}</td>
                    <td>
                      @if (u.id === currentAdminId()) {
                        <span class="current-user-tag">Your Account</span>
                      } @else {
                        <button
                          class="toggle-role-btn"
                          [class.demote]="u.is_admin"
                          (click)="toggleAdminRole(u)"
                        >
                          {{ u.is_admin ? 'Revoke Admin' : 'Make Admin' }}
                        </button>
                      }
                    </td>
                  </tr>
                }
                @if (filteredUsers().length === 0) {
                  <tr>
                    <td colspan="6" class="empty-table-msg">No users match your search query.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- TAB 3: CORPORATE JOBS MANAGEMENT -->
      @if (activeTab() === 'jobs') {
        <div class="jobs-management-grid">
          <!-- Post Job Form -->
          <div class="post-job-card">
            <h3>Publish Corporate Job Opening</h3>
            <p class="card-desc">
              Uploaded jobs appear in the candidate workspace with skill matching against applicant resumes.
            </p>

            <form (ngSubmit)="submitCorporateJob()" novalidate>
              <div class="form-group">
                <label>Job Title *</label>
                <input
                  type="text"
                  [(ngModel)]="newJob.title"
                  name="title"
                  placeholder="e.g. Senior Machine Learning Engineer"
                  class="admin-input"
                  required
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="newJob.company"
                    name="company"
                    placeholder="e.g. Datadog, Stripe"
                    class="admin-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    [(ngModel)]="newJob.location"
                    name="location"
                    placeholder="e.g. Remote / New York"
                    class="admin-input"
                  />
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Salary Range</label>
                  <input
                    type="text"
                    [(ngModel)]="newJob.salary_range"
                    name="salary_range"
                    placeholder="e.g. $135,000 - $170,000 / yr"
                    class="admin-input"
                  />
                </div>
                <div class="form-group">
                  <label>Required Software Skills</label>
                  <input
                    type="text"
                    [(ngModel)]="newJob.required_skills"
                    name="required_skills"
                    placeholder="e.g. Python, PyTorch, Docker, FastAPI"
                    class="admin-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>Job Description & Responsibilities</label>
                <textarea
                  [(ngModel)]="newJob.description"
                  name="description"
                  rows="3"
                  placeholder="Briefly describe the key expectations and technical challenges for this role..."
                  class="admin-textarea"
                ></textarea>
              </div>

              <button
                type="submit"
                class="publish-job-btn"
                [disabled]="!newJob.title.trim() || !newJob.company.trim() || isSubmittingJob()"
              >
                {{ isSubmittingJob() ? 'Publishing…' : '+ Publish Job Opening' }}
              </button>
            </form>
          </div>

          <!-- Existing Corporate Postings -->
          <div class="active-jobs-card">
            <div class="card-heading">
              <h3>Active Corporate Postings</h3>
              <span class="count-badge">{{ corporateJobs().length }} Published</span>
            </div>

            <div class="corporate-jobs-list">
              @for (job of corporateJobs(); track job.id) {
                <div class="job-item">
                  <div class="job-item-header">
                    <div>
                      <h4>{{ job.title }}</h4>
                      <span class="job-company">{{ job.company }} · {{ job.location }}</span>
                    </div>
                    <button class="delete-job-btn" (click)="deleteJob(job.id)" title="Delete posting">
                      🗑 Delete
                    </button>
                  </div>

                  <div class="job-details">
                    <span class="sal-tag">{{ job.salary_range }}</span>
                    @if (job.required_skills) {
                      <div class="skills-strip">
                        @for (skill of parseSkills(job.required_skills); track skill) {
                          <span class="mini-skill-pill">{{ skill }}</span>
                        }
                      </div>
                    }
                  </div>
                  @if (job.description) {
                    <p class="job-desc-text">{{ job.description }}</p>
                  }
                  <small class="job-posted-date">Posted {{ job.created_at | date:'mediumDate' }}</small>
                </div>
              }
              @if (corporateJobs().length === 0) {
                <div class="empty-jobs-box">
                  <p>No corporate jobs posted yet.</p>
                  <small>Use the form on the left to publish openings for your candidates.</small>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-shell {
      max-width: 1140px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .page-header h1 {
      font: 700 28px/1.2 'Manrope', sans-serif;
      color: #172b45;
      margin: 6px 0;
      letter-spacing: -0.8px;
    }
    .subtitle {
      font-size: 13px;
      line-height: 1.6;
      color: #718095;
      margin: 0;
      max-width: 650px;
    }
    .admin-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 11px;
    }
    .admin-shield {
      font-size: 16px;
    }

    /* Tabs */
    .admin-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 9px 16px;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: #183c61;
      color: #fff;
      border-color: #183c61;
    }
    .tab-count {
      background: #e2e8f0;
      color: #1e293b;
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 10px;
    }
    .tab-btn.active .tab-count {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .tab-count.highlight {
      background: #3b82f6;
      color: #fff;
    }

    /* Status banner */
    .status-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .status-banner.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .status-banner.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .close-alert-btn {
      margin-left: auto;
      background: transparent;
      border: 0;
      cursor: pointer;
      color: inherit;
    }

    /* Telemetry Grid */
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-box {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 18px;
      box-shadow: 0 2px 6px rgba(16, 35, 63, 0.03);
    }
    .stat-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
      display: block;
      margin-bottom: 6px;
    }
    .stat-num {
      display: block;
      font: 800 32px 'Manrope', sans-serif;
      color: #172b45;
      line-height: 1.1;
    }
    .stat-num.highlight {
      color: #2563eb;
    }
    .stat-sub {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 6px;
    }
    .stat-status-online {
      display: flex;
      align-items: center;
      gap: 6px;
      font: 700 18px 'Manrope', sans-serif;
      color: #16a34a;
      margin-top: 4px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #16a34a;
    }

    /* Card & Tables */
    .recent-users-card, .users-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 22px;
      box-shadow: 0 2px 6px rgba(16, 35, 63, 0.03);
    }
    .card-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .card-heading h3 {
      font: 700 18px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0;
    }
    .card-heading p {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 0;
    }
    .small-refresh-btn {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .user-search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 0 12px;
      height: 36px;
      min-width: 250px;
    }
    .user-search-box span {
      color: #94a3b8;
    }
    .user-search-box input {
      border: 0;
      outline: none;
      background: transparent;
      font-size: 12px;
      width: 100%;
    }
    .table-wrap {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th {
      text-align: left;
      padding: 10px 12px;
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
      color: #64748b;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .role-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      background: #f1f5f9;
      color: #475569;
    }
    .role-pill.admin {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .toggle-role-btn {
      background: #eff6ff;
      border: 1px solid #93c5fd;
      color: #1d4ed8;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
    }
    .toggle-role-btn.demote {
      background: #fff7ed;
      border-color: #fdba74;
      color: #c2410c;
    }
    .current-user-tag {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }
    .empty-table-msg {
      text-align: center;
      padding: 24px;
      color: #94a3b8;
    }

    /* Jobs Management Grid */
    .jobs-management-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .post-job-card, .active-jobs-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 22px;
      box-shadow: 0 2px 6px rgba(16, 35, 63, 0.03);
    }
    .post-job-card h3, .active-jobs-card h3 {
      font: 700 18px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0;
    }
    .card-desc {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 16px;
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-group label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .admin-input, .admin-textarea {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 8px 10px;
      font-size: 12px;
      color: #1e293b;
      outline: none;
      background: #fff;
    }
    .admin-input:focus, .admin-textarea:focus {
      border-color: #3b82f6;
    }
    .publish-job-btn {
      width: 100%;
      background: #183c61;
      color: #fff;
      border: 0;
      border-radius: 5px;
      padding: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 6px;
      transition: background 0.2s;
    }
    .publish-job-btn:hover {
      background: #255383;
    }
    .publish-job-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Active Corporate Postings List */
    .count-badge {
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
    }
    .corporate-jobs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 520px;
      overflow-y: auto;
      margin-top: 14px;
    }
    .job-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
    }
    .job-item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .job-item-header h4 {
      margin: 0;
      font: 700 14px 'Manrope', sans-serif;
      color: #1e293b;
    }
    .job-company {
      font-size: 11px;
      color: #64748b;
    }
    .delete-job-btn {
      background: transparent;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .delete-job-btn:hover {
      background: #fef2f2;
    }
    .job-details {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
      flex-wrap: wrap;
    }
    .sal-tag {
      font-size: 10px;
      font-weight: 700;
      color: #047857;
      background: #ecfdf5;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .skills-strip {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .mini-skill-pill {
      font-size: 9px;
      background: #e2e8f0;
      color: #334155;
      padding: 2px 5px;
      border-radius: 3px;
    }
    .job-desc-text {
      font-size: 11px;
      color: #64748b;
      margin: 6px 0;
      line-height: 1.4;
    }
    .job-posted-date {
      font-size: 9px;
      color: #94a3b8;
    }
    .empty-jobs-box {
      text-align: center;
      padding: 30px 10px;
      color: #94a3b8;
    }
    @media (max-width: 850px) {
      .jobs-management-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);

  readonly activeTab = signal<'telemetry' | 'users' | 'jobs'>('telemetry');
  readonly stats = signal<AdminStats | null>(null);
  readonly users = signal<UserProfile[]>([]);
  readonly corporateJobs = signal<CorporateJob[]>([]);

  readonly currentAdmin = this.auth.user;
  readonly currentAdminName = computed(() => this.currentAdmin()?.full_name ?? 'Administrator');
  readonly currentAdminId = computed(() => this.currentAdmin()?.id ?? 0);

  userSearchQuery = '';
  alertMessage = signal('');
  alertSuccess = signal(true);
  isSubmittingJob = signal(false);

  newJob = {
    title: '',
    company: '',
    location: 'Remote',
    salary_range: '',
    required_skills: '',
    description: ''
  };

  readonly filteredUsers = computed(() => {
    const q = this.userSearchQuery.trim().toLowerCase();
    const list = this.users();
    if (!q) return list;
    return list.filter((u) =>
      u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.adminService.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {}
    });
    this.adminService.getUsers().subscribe({
      next: (u) => this.users.set(u),
      error: () => {}
    });
    this.adminService.getCorporateJobs().subscribe({
      next: (j) => this.corporateJobs.set(j),
      error: () => {}
    });
  }

  toggleAdminRole(user: UserProfile): void {
    this.adminService.toggleAdmin(user.id).subscribe({
      next: (res) => {
        this.alertSuccess.set(true);
        this.alertMessage.set(res.message);
        // Update user in local list
        this.users.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, is_admin: res.is_admin } : u))
        );
      },
      error: (err) => {
        this.alertSuccess.set(false);
        this.alertMessage.set(this.auth.messageFor(err));
      }
    });
  }

  submitCorporateJob(): void {
    if (!this.newJob.title.trim() || !this.newJob.company.trim() || this.isSubmittingJob()) return;
    this.isSubmittingJob.set(true);

    this.adminService.createCorporateJob(this.newJob).subscribe({
      next: (created) => {
        this.corporateJobs.update((list) => [created, ...list]);
        this.alertSuccess.set(true);
        this.alertMessage.set(`Successfully published "${created.title}" at ${created.company}!`);
        this.newJob = {
          title: '',
          company: '',
          location: 'Remote',
          salary_range: '',
          required_skills: '',
          description: ''
        };
        this.isSubmittingJob.set(false);
      },
      error: (err) => {
        this.isSubmittingJob.set(false);
        this.alertSuccess.set(false);
        this.alertMessage.set(this.auth.messageFor(err));
      }
    });
  }

  deleteJob(id: number): void {
    if (!confirm('Are you sure you want to remove this job posting?')) return;
    this.adminService.deleteCorporateJob(id).subscribe({
      next: () => {
        this.corporateJobs.update((list) => list.filter((j) => j.id !== id));
        this.alertSuccess.set(true);
        this.alertMessage.set('Job opening removed successfully.');
      },
      error: (err) => {
        this.alertSuccess.set(false);
        this.alertMessage.set(this.auth.messageFor(err));
      }
    });
  }

  parseSkills(skillsStr: string): string[] {
    if (!skillsStr) return [];
    return skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
