import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AnalysisService } from '../../core/analysis.service';

const PREFERENCES_STORAGE = 'careerpilot_user_preferences';

interface UserPreferences {
  targetRole: string;
  workPreference: string;
  experienceLevel: string;
  targetCompany: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="profile-container">
      <div class="page-header">
        <div>
          <span class="eyebrow">ACCOUNT & CAREER SETTINGS</span>
          <h1>User Profile & Career Dashboard</h1>
          <p class="subtitle">
            Manage your personal profile, career preferences, machine learning data, and export your Career Readiness Report.
          </p>
        </div>
        <div class="header-actions">
          <button class="report-btn" (click)="downloadCareerReport()">
            <span>📥</span> Download Career Report
          </button>
        </div>
      </div>

      <!-- Notification alert -->
      @if (statusMessage()) {
        <div class="status-alert" [class.success]="isSuccess()" [class.error]="!isSuccess()">
          {{ statusMessage() }}
        </div>
      }

      <div class="profile-grid">
        <!-- Left Column: User Card & Preferences -->
        <div class="column-left">
          <!-- Profile Card -->
          <div class="card user-card">
            <div class="user-header">
              <div class="avatar-large">{{ initials() }}</div>
              <div class="user-meta">
                <h2>{{ user()?.full_name ?? 'Career Explorer' }}</h2>
                <p>{{ user()?.email }}</p>
                <span class="tier-pill">CareerPilot Pro · ML Active</span>
              </div>
            </div>

            <div class="edit-section">
              <span class="label">EDIT FULL NAME</span>
              <div class="input-inline">
                <input
                  type="text"
                  [(ngModel)]="editName"
                  placeholder="Enter full name"
                  class="name-input"
                />
                <button
                  class="save-btn"
                  [disabled]="savingName() || !editName.trim()"
                  (click)="saveFullName()"
                >
                  {{ savingName() ? 'Saving…' : 'Update' }}
                </button>
              </div>
            </div>

            <div class="user-details-list">
              <div class="detail-item">
                <span class="d-label">Account ID</span>
                <span class="d-val">#{{ user()?.id }}</span>
              </div>
              <div class="detail-item">
                <span class="d-label">Registered Email</span>
                <span class="d-val">{{ user()?.email }}</span>
              </div>
              <div class="detail-item">
                <span class="d-label">Security</span>
                <span class="d-val">JWT Protected (HS256)</span>
              </div>
            </div>
          </div>

          <!-- Career Preferences Form -->
          <div class="card preferences-card">
            <div class="card-title-row">
              <h3>Target Career Preferences</h3>
              <small>Customizes your AI matched roles</small>
            </div>

            <div class="pref-form">
              <div class="form-group">
                <label>Primary Target Title</label>
                <input
                  type="text"
                  [(ngModel)]="preferences.targetRole"
                  placeholder="e.g. Senior Frontend Engineer"
                />
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Work Style</label>
                  <select [(ngModel)]="preferences.workPreference">
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label>Experience Level</label>
                  <select [(ngModel)]="preferences.experienceLevel">
                    <option value="Entry Level (0-2 yrs)">Entry Level (0-2 yrs)</option>
                    <option value="Mid-Level (3-5 yrs)">Mid-Level (3-5 yrs)</option>
                    <option value="Senior (5+ yrs)">Senior (5+ yrs)</option>
                    <option value="Lead / Staff">Lead / Staff</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Target Company Tier</label>
                <select [(ngModel)]="preferences.targetCompany">
                  <option value="FAANG / Big Tech">FAANG / Big Tech</option>
                  <option value="High-growth Tech Startup">High-growth Tech Startup</option>
                  <option value="Enterprise / Fortune 500">Enterprise / Fortune 500</option>
                  <option value="Open Source & Research">Open Source & Research</option>
                </select>
              </div>

              <button class="pref-save-btn" (click)="savePreferences()">
                Save Career Preferences
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: ML Analytics & Report Summary -->
        <div class="column-right">
          <!-- ML Analytics Overview -->
          <div class="card ml-card">
            <span class="eyebrow light-eyebrow">DATASET-TRAINED MODEL STATUS</span>
            <h3>Machine Learning Profile Summary</h3>

            @if (hasAnalysis()) {
              <div class="ml-stats-grid">
                <div class="ml-stat-box">
                  <span class="box-label">DETECTED FAMILY</span>
                  <span class="box-val">{{ analysis()?.detected_family?.name }}</span>
                  <small>{{ analysis()?.detected_family?.confidence }}% Confidence</small>
                </div>

                <div class="ml-stat-box">
                  <span class="box-label">RECOGNIZED SKILLS</span>
                  <span class="box-val">{{ verifiedSkills().length }}</span>
                  <small>Software Technologies</small>
                </div>

                <div class="ml-stat-box">
                  <span class="box-label">TOP MATCHED ROLE</span>
                  <span class="box-val">{{ topRole()?.title || 'None' }}</span>
                  <small>{{ topRole()?.similarity_score }}% Similarity</small>
                </div>

                <div class="ml-stat-box">
                  <span class="box-label">READINESS INDEX</span>
                  <span class="box-val green">{{ readinessPct() }}%</span>
                  <small>Overall Competency</small>
                </div>
              </div>

              <div class="chips-area">
                <span class="chips-title">Verified Skills in System:</span>
                <div class="chips-row">
                  @for (s of verifiedSkills().slice(0, 10); track s) {
                    <span class="chip-sm">{{ s }}</span>
                  }
                  @if (verifiedSkills().length > 10) {
                    <span class="chip-sm more">+{{ verifiedSkills().length - 10 }} more</span>
                  }
                </div>
              </div>

              <div class="ml-actions">
                <a routerLink="/resume-analysis" class="action-link">
                  ↻ Re-upload & Re-evaluate Resume
                </a>
                <button class="danger-btn" (click)="clearAnalysis()">
                  Clear Saved ML Analysis
                </button>
              </div>
            } @else {
              <div class="no-ml-state">
                <p>No resume has been uploaded yet for this session.</p>
                <a routerLink="/resume-analysis" class="start-btn">
                  Analyze Resume Now →
                </a>
              </div>
            }
          </div>

          <!-- Quick Navigation Hub -->
          <div class="card nav-hub-card">
            <h3>Career Workspace Shortcuts</h3>
            <div class="hub-links">
              <a routerLink="/jobs" class="hub-item">
                <div class="hub-icon">⌕</div>
                <div>
                  <strong>Job & Role Matches</strong>
                  <small>View semantic matches based on O*NET database</small>
                </div>
                <span>→</span>
              </a>

              <a routerLink="/skills" class="hub-item">
                <div class="hub-icon">⌁</div>
                <div>
                  <strong>Skill Gap Plan</strong>
                  <small>Track missing priority software skills</small>
                </div>
                <span>→</span>
              </a>

              <a routerLink="/interview" class="hub-item">
                <div class="hub-icon">◉</div>
                <div>
                  <strong>Interview Practice</strong>
                  <small>Mock interviews with FAANG & Startup personas</small>
                </div>
                <span>→</span>
              </a>
            </div>
          </div>

          <!-- Account Sign Out -->
          <div class="card signout-card">
            <div>
              <strong>Sign Out of Session</strong>
              <p>Ends your current session on this device.</p>
            </div>
            <button class="signout-btn" (click)="logout()">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 1100px;
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
    .report-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #183c61;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 10px 18px;
      border-radius: 5px;
      border: 0;
      cursor: pointer;
      transition: background 0.2s;
    }
    .report-btn:hover { background: #28557f; }
    .status-alert {
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .status-alert.success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .status-alert.error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .column-left, .column-right {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
    }
    .user-header {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 18px;
    }
    .avatar-large {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: #183c61;
      color: #fff;
      display: grid;
      place-items: center;
      font: 800 20px 'Manrope', sans-serif;
    }
    .user-meta h2 {
      font: 700 20px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0 0 4px;
    }
    .user-meta p {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 6px;
    }
    .tier-pill {
      background: #f1f5f9;
      color: #2563eb;
      font-size: 9px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      letter-spacing: 0.5px;
    }
    .edit-section {
      margin-bottom: 18px;
    }
    .edit-section .label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
      display: block;
      margin-bottom: 6px;
    }
    .input-inline {
      display: flex;
      gap: 8px;
    }
    .name-input {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 8px 12px;
      font-size: 12px;
      color: #1e293b;
      outline: none;
    }
    .save-btn {
      background: #183c61;
      color: #fff;
      border: 0;
      border-radius: 5px;
      padding: 0 16px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .user-details-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .detail-item {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 6px 0;
      border-bottom: 1px solid #f8fafc;
    }
    .d-label { color: #64748b; }
    .d-val { font-weight: 600; color: #1e293b; }
    .card-title-row {
      margin-bottom: 16px;
    }
    .card-title-row h3 {
      font: 700 16px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0 0 2px;
    }
    .card-title-row small { font-size: 11px; color: #64748b; }
    .pref-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
    .form-group input, .form-group select {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 8px 12px;
      font-size: 12px;
      color: #1e293b;
      outline: none;
    }
    .form-row {
      display: flex;
      gap: 12px;
    }
    .flex-1 { flex: 1; }
    .pref-save-btn {
      background: #183c61;
      color: #fff;
      border: 0;
      border-radius: 5px;
      padding: 10px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 6px;
    }
    .ml-card {
      background: linear-gradient(135deg, #183553 0%, #1e456e 100%);
      color: #fff;
    }
    .ml-card h3 {
      font: 700 18px 'Manrope', sans-serif;
      margin: 6px 0 16px;
    }
    .ml-stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .ml-stat-box {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .box-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #94a3b8;
    }
    .box-val {
      font: 700 14px 'Manrope', sans-serif;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .box-val.green { color: #10b981; font-size: 18px; }
    .ml-stat-box small { font-size: 9px; color: #cbd5e1; }
    .chips-area {
      margin: 14px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 12px;
    }
    .chips-title {
      font-size: 10px;
      color: #cbd5e1;
      display: block;
      margin-bottom: 6px;
    }
    .chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip-sm {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 9px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .ml-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .action-link {
      color: #93c5fd;
      font-size: 11px;
      font-weight: 600;
    }
    .danger-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #fca5a5;
      font-size: 10px;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
    }
    .no-ml-state {
      padding: 20px 0;
      text-align: center;
    }
    .no-ml-state p { font-size: 12px; color: #cbd5e1; margin-bottom: 12px; }
    .start-btn {
      display: inline-block;
      background: #fff;
      color: #183553;
      font-size: 11px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 5px;
    }
    .nav-hub-card h3 {
      font: 700 15px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0 0 14px;
    }
    .hub-links {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .hub-item {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      transition: all 0.2s;
    }
    .hub-item:hover {
      background: #edf4fb;
      border-color: #cbd5e1;
    }
    .hub-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #e2e8f0;
      display: grid;
      place-items: center;
      color: #1e3a5f;
      font-size: 14px;
    }
    .hub-item strong {
      display: block;
      font-size: 12px;
      color: #1e293b;
    }
    .hub-item small {
      display: block;
      font-size: 10px;
      color: #64748b;
    }
    .hub-item span {
      margin-left: auto;
      color: #94a3b8;
    }
    .signout-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .signout-card strong {
      font-size: 12px;
      color: #1e293b;
      display: block;
    }
    .signout-card p {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0;
    }
    .signout-btn {
      background: #fff;
      border: 1px solid #ef4444;
      color: #dc2626;
      border-radius: 5px;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .signout-btn:hover {
      background: #fef2f2;
    }
    @media (max-width: 800px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly analysisService = inject(AnalysisService);

  readonly user = this.auth.user;
  readonly analysis = this.analysisService.result;
  readonly hasAnalysis = computed(() => !!this.analysis());

  editName = '';
  savingName = signal(false);
  statusMessage = signal('');
  isSuccess = signal(true);

  preferences: UserPreferences = {
    targetRole: 'Software Developer',
    workPreference: 'Remote',
    experienceLevel: 'Mid-Level (3-5 yrs)',
    targetCompany: 'FAANG / Big Tech'
  };

  readonly initials = computed(() => {
    const name = this.user()?.full_name || 'Career Explorer';
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  });

  readonly verifiedSkills = computed(() => this.analysis()?.recognized_software_skills ?? []);
  readonly topRole = computed(() => this.analysis()?.recommendations?.[0] ?? null);

  readonly readinessPct = computed(() => {
    const recs = this.analysis()?.recommendations ?? [];
    if (recs.length === 0) return 0;
    let matchedCount = 0;
    let missingCount = 0;
    for (const r of recs) {
      matchedCount += r.matching_skills.length;
      missingCount += r.missing_skills.length;
    }
    if (matchedCount + missingCount === 0) return 100;
    return Math.round((matchedCount / (matchedCount + missingCount)) * 100);
  });

  ngOnInit(): void {
    this.editName = this.user()?.full_name || '';
    this.loadPreferences();
  }

  saveFullName(): void {
    const clean = this.editName.trim();
    if (!clean) return;
    this.savingName.set(true);
    this.auth.updateProfile(clean).subscribe({
      next: () => {
        this.savingName.set(false);
        this.statusMessage.set('Profile name updated successfully!');
        this.isSuccess.set(true);
        setTimeout(() => this.statusMessage.set(''), 3000);
      },
      error: (err) => {
        this.savingName.set(false);
        this.statusMessage.set(this.auth.messageFor(err));
        this.isSuccess.set(false);
      }
    });
  }

  savePreferences(): void {
    try {
      localStorage.setItem(PREFERENCES_STORAGE, JSON.stringify(this.preferences));
      this.statusMessage.set('Career preferences saved successfully!');
      this.isSuccess.set(true);
      setTimeout(() => this.statusMessage.set(''), 3000);
    } catch {
      this.statusMessage.set('Failed to save preferences.');
      this.isSuccess.set(false);
    }
  }

  clearAnalysis(): void {
    if (confirm('Are you sure you want to clear your saved resume ML analysis?')) {
      this.analysisService.clear();
      this.statusMessage.set('Saved ML analysis has been cleared.');
      this.isSuccess.set(true);
      setTimeout(() => this.statusMessage.set(''), 3000);
    }
  }

  downloadCareerReport(): void {
    const u = this.user();
    const a = this.analysis();
    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let report = `# CAREERPILOT AI · CAREER READINESS & ML MATCH REPORT\n`;
    report += `Generated on: ${now}\n`;
    report += `Candidate: ${u?.full_name ?? 'User'} (${u?.email})\n`;
    report += `Account ID: #${u?.id}\n`;
    report += `\n---\n\n`;

    report += `## 1. CAREER PREFERENCES\n`;
    report += `- Primary Target Role: ${this.preferences.targetRole}\n`;
    report += `- Work Style: ${this.preferences.workPreference}\n`;
    report += `- Experience Level: ${this.preferences.experienceLevel}\n`;
    report += `- Target Industry Tier: ${this.preferences.targetCompany}\n\n`;

    if (a) {
      report += `## 2. MACHINE LEARNING RESUME EVALUATION\n`;
      report += `- Detected Occupation Family: ${a.detected_family.name} (${a.detected_family.confidence}% confidence)\n`;
      report += `- Overall Skill Readiness Score: ${this.readinessPct()}%\n`;
      report += `- Verified Software Skills (${a.recognized_software_skills.length}): ${a.recognized_software_skills.join(', ')}\n\n`;

      report += `## 3. O*NET MATCHED OCCUPATIONS & ROLE PROFILES\n`;
      for (const r of a.recommendations) {
        report += `### ${r.title} (SOC: ${r.soc_code}) - ${r.similarity_score}% Semantic Similarity\n`;
        report += `- Family: ${r.family}\n`;
        report += `- Matching Skills: ${r.matching_skills.join(', ') || 'None explicitly matched'}\n`;
        report += `- Priority Skills to Build: ${r.missing_skills.join(', ') || 'Fully covered'}\n\n`;
      }

      report += `## 4. ACTIONABLE UPSKILLING ROADMAP\n`;
      report += `1. Focus on mastering top priority gaps: ${this.topRole()?.missing_skills.slice(0, 3).join(', ') || 'Advanced frameworks'}.\n`;
      report += `2. Build production-grade portfolio projects demonstrating these competencies.\n`;
      report += `3. Practice mock interview scenarios with FAANG & Startup personas in CareerPilot.\n\n`;
    } else {
      report += `## 2. RESUME EVALUATION STATUS\n`;
      report += `No resume has been uploaded yet. Please visit the Resume Review section to generate an ML match profile.\n\n`;
    }

    report += `\nReport generated by CareerPilot AI (Trained on U.S. Dept of Labor O*NET 31.0 Database)\n`;

    // Trigger download
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CareerPilot_Report_${(u?.full_name || 'Candidate').replace(/\s+/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  logout(): void {
    this.auth.logout();
  }

  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE);
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch {}
  }
}
