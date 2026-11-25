import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AiService } from '../../core/ai.service';
import { AnalysisService } from '../../core/analysis.service';
import { ResumeAnalysis } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="analysis-shell">
      <header class="analysis-header">
        <a class="brand analysis-brand" routerLink="/dashboard"><span class="brand-mark">cp</span><span>careerpilot<span class="brand-ai">.ai</span></span></a>
        <a class="back-link" routerLink="/dashboard">← Back to workspace</a>
      </header>
      <main class="analysis-main">
        <span class="eyebrow">RESUME REVIEW · DATASET-TRAINED ML</span>
        <h1>Find the work your experience points toward.</h1>
        <p class="analysis-intro">Upload a text-based PDF or DOCX. CareerPilot will evaluate ATS readiness, identify your likely occupation family, recognize software skills, and compare your experience with O*NET role profiles.</p>

        <section class="upload-card">
          <div class="upload-icon">↑</div>
          <h2>Start with your resume</h2>
          <p>PDF or DOCX · up to 5 MB · scanned-image PDFs need OCR and are not supported yet</p>
          <label class="file-picker" for="resume-file">{{ selectedFile()?.name ?? 'Choose a resume' }} <span>Browse files</span></label>
          <input id="resume-file" class="visually-hidden" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" (change)="onFileSelected($event)">
          @if (error()) { <div class="analysis-error" role="alert">{{ error() }}</div> }
          <button class="analyze-button" type="button" [disabled]="!selectedFile() || loading()" (click)="analyze()">
            {{ loading() ? 'Reviewing your resume…' : 'Analyze resume' }} <span>→</span>
          </button>
          <small class="privacy-note">Your resume is analyzed in memory for this request and is not saved by this feature.</small>
        </section>

        @if (result(); as analysis) {
          <section class="result-section" aria-live="polite">
            <div class="result-heading">
              <div>
                <span class="eyebrow">YOUR RESULTS</span>
                <h2>A first look at your experience</h2>
              </div>
              <span class="method-tag">TRAINED MODEL + TF-IDF</span>
            </div>

            <!-- ATS Resume Health Scorecard -->
            @if (analysis.ats_scorecard; as ats) {
              <article class="ats-card">
                <div class="ats-header">
                  <div>
                    <span class="eyebrow">ATS READINESS & HEALTH</span>
                    <h3>Applicant Tracking System (ATS) Scorecard</h3>
                  </div>
                  <div class="ats-badge" [class.excellent]="ats.score >= 80" [class.good]="ats.score >= 60 && ats.score < 80" [class.needs-opt]="ats.score < 60">
                    <span class="badge-dot"></span>
                    <span>{{ ats.rating }} ({{ ats.score }}/100)</span>
                  </div>
                </div>

                <div class="ats-stats-grid">
                  <div class="ats-stat-box">
                    <span class="stat-num">{{ ats.score }}<small>/100</small></span>
                    <span class="stat-lbl">Overall ATS Health</span>
                  </div>
                  <div class="ats-stat-box">
                    <span class="stat-num">{{ ats.word_count }}</span>
                    <span class="stat-lbl">Word Count</span>
                  </div>
                  <div class="ats-stat-box">
                    <span class="stat-num">{{ ats.quantifiable_metrics_count }}</span>
                    <span class="stat-lbl">Quantified Metrics</span>
                  </div>
                  <div class="ats-stat-box">
                    <span class="stat-num">{{ ats.action_verbs_count }}</span>
                    <span class="stat-lbl">Strong Action Verbs</span>
                  </div>
                </div>

                <div class="ats-checks-wrap">
                  <h4>Automated ATS Compliance Checks</h4>
                  <div class="checks-grid">
                    @for (item of ats.checks; track item.label) {
                      <div class="check-item" [class.pass]="item.passed" [class.fail]="!item.passed">
                        <span class="check-status-icon">{{ item.passed ? '✓' : '!' }}</span>
                        <div>
                          <strong>{{ item.label }}</strong>
                          <p>{{ item.detail }}</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                @if (ats.improvement_tips.length > 0) {
                  <div class="ats-tips-box">
                    <h4>Top Actionable Recommendations for ATS Optimization</h4>
                    <ul>
                      @for (tip of ats.improvement_tips; track tip) {
                        <li>{{ tip }}</li>
                      }
                    </ul>
                  </div>
                }
              </article>
            }

            <article class="family-card">
              <div>
                <span class="eyebrow light-eyebrow">LIKELY OCCUPATION FAMILY</span>
                <h3>{{ analysis.detected_family.name }}</h3>
                <p>Uncalibrated model score: {{ analysis.detected_family.confidence }}%</p>
              </div>
              <div class="family-alternatives">
                <small>Other possible families</small>
                @for (family of analysis.alternative_families.slice(1); track family.code) {
                  <span>{{ family.name }} · {{ family.confidence }}%</span>
                }
              </div>
            </article>

            <article class="skills-card">
              <div class="result-subhead">
                <div>
                  <span class="eyebrow">SKILLS FOUND</span>
                  <h3>Recognized software skills</h3>
                </div>
                <span class="count-pill">{{ analysis.recognized_software_skills.length }}</span>
              </div>
              @if (analysis.recognized_software_skills.length) {
                <div class="skill-chips">
                  @for (skill of analysis.recognized_software_skills; track skill) {
                    <span>{{ skill }}</span>
                  }
                </div>
              } @else {
                <p class="muted-copy">No software skills from the dataset vocabulary were explicitly detected. The role suggestions still use the resume text.</p>
              }
            </article>

            <div class="result-subhead recommendations-title">
              <div>
                <span class="eyebrow">ROLE EXPLORATION</span>
                <h2>Roles worth exploring</h2>
                <p class="muted-copy">Ranked by text similarity to occupational task profiles.</p>
              </div>
              <a routerLink="/jobs" class="view-all-jobs-btn">View All in Job Matches →</a>
            </div>

            <div class="recommendation-list">
              @for (role of analysis.recommendations; track role.soc_code) {
                <article class="role-card">
                  <div class="role-top">
                    <div>
                      <span class="role-family">{{ role.family }} · {{ role.soc_code }}</span>
                      <h3>{{ role.title }}</h3>
                    </div>
                    <div class="similarity">
                      <strong>{{ role.similarity_score }}%</strong>
                      <small>text similarity</small>
                    </div>
                  </div>

                  <div class="similarity-track">
                    <span [style.width.%]="role.similarity_score"></span>
                  </div>

                  @if (role.salary) {
                    <div class="salary-strip">
                      <span class="salary-tag">Entry: {{ role.salary.entry_level }}</span>
                      <span class="salary-tag median">Median: {{ role.salary.median }}</span>
                      <span class="salary-tag">Senior: {{ role.salary.senior }}</span>
                      <span class="outlook-tag">{{ role.salary.growth_outlook }}</span>
                    </div>
                  }

                  <div class="role-skills">
                    <div>
                      <strong>Skills matched</strong>
                      @if (role.matching_skills.length) {
                        <span>{{ role.matching_skills.join(' · ') }}</span>
                      } @else {
                        <span>No listed software skills matched explicitly.</span>
                      }
                    </div>
                    <div>
                      <strong>Potential skills to build</strong>
                      @if (role.missing_skills.length) {
                        <span>{{ role.missing_skills.join(' · ') }}</span>
                      } @else {
                        <span>No additional priority software skills listed.</span>
                      }
                    </div>
                  </div>

                  <div class="role-actions">
                    <a [routerLink]="['/interview']" [queryParams]="{ role: role.title, soc: role.soc_code }" class="role-act-link primary">
                      Practice Interview with AI Chatbot →
                    </a>
                    <a [routerLink]="['/skills']" [queryParams]="{ role: role.title, soc: role.soc_code }" class="role-act-link">
                      View Personalized Skill Plan →
                    </a>
                  </div>
                </article>
              }
            </div>

            <article class="model-card">
              <div>
                <span class="eyebrow">HOW THIS RESULT WAS BUILT</span>
                <h3>{{ analysis.model_info.name }}</h3>
                <p>Trained on {{ analysis.model_info.training_examples.toLocaleString() }} O*NET task statements and evaluated on a held-out set of {{ analysis.model_info.test_examples.toLocaleString() }}. The role catalogue contains {{ analysis.model_info.occupation_profiles.toLocaleString() }} occupation profiles.</p>
              </div>
              <div class="metric-row">
                <span>Macro precision <strong>{{ (analysis.model_info.precision_macro * 100).toFixed(1) }}%</strong></span>
                <span>Macro recall <strong>{{ (analysis.model_info.recall_macro * 100).toFixed(1) }}%</strong></span>
                <span>Macro F1 <strong>{{ (analysis.model_info.f1_macro * 100).toFixed(1) }}%</strong></span>
              </div>
              <small class="data-credit">Data: {{ analysis.model_info.dataset }} · U.S. Department of Labor, Employment and Training Administration · CC BY 4.0. CareerPilot's transformed model and profiles are not endorsed by the source.</small>
              <p class="disclaimer">{{ analysis.notice }} Occupational information is based on U.S. job data; use it as a starting point, not a hiring prediction.</p>
            </article>
          </section>
        }
      </main>
    </div>
  `,
  styles: [`
    .ats-card {
      background: #ffffff;
      border: 1px solid #e1e7ee;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(16, 35, 63, 0.04);
    }
    .ats-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ats-header h3 {
      font: 700 20px 'Manrope', sans-serif;
      color: #172b45;
      margin: 4px 0 0;
    }
    .ats-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .ats-badge.excellent {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .ats-badge.good {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }
    .ats-badge.needs-opt {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    .ats-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .ats-stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      text-align: center;
    }
    .ats-stat-box .stat-num {
      display: block;
      font: 800 22px 'Manrope', sans-serif;
      color: #112846;
    }
    .ats-stat-box .stat-num small {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .ats-stat-box .stat-lbl {
      display: block;
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .ats-checks-wrap {
      margin-bottom: 20px;
    }
    .ats-checks-wrap h4, .ats-tips-box h4 {
      font: 700 13px 'Manrope', sans-serif;
      color: #1e293b;
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .checks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
    }
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .check-item.pass {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .check-item.fail {
      background: #fff7ed;
      border-color: #fed7aa;
    }
    .check-status-icon {
      font-weight: 800;
      font-size: 14px;
      line-height: 1;
      padding-top: 2px;
    }
    .check-item.pass .check-status-icon {
      color: #16a34a;
    }
    .check-item.fail .check-status-icon {
      color: #ea580c;
    }
    .check-item strong {
      display: block;
      color: #1e293b;
      font-size: 12px;
    }
    .check-item p {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 11px;
    }
    .ats-tips-box {
      background: #f8fafc;
      border-left: 3px solid #2563eb;
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
    }
    .ats-tips-box ul {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      color: #334155;
      line-height: 1.6;
    }
    .salary-strip {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 12px 0;
      align-items: center;
    }
    .salary-tag {
      background: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .salary-tag.median {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
    }
    .outlook-tag {
      background: #ecfdf5;
      color: #047857;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .role-actions {
      display: flex;
      gap: 12px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }
    .role-act-link {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-decoration: none;
      transition: color 0.2s;
    }
    .role-act-link:hover {
      color: #1d4ed8;
    }
    .role-act-link.primary {
      color: #2563eb;
    }
    .view-all-jobs-btn {
      font-size: 12px;
      font-weight: 700;
      color: #2563eb;
      text-decoration: none;
      align-self: center;
    }
    .view-all-jobs-btn:hover {
      text-decoration: underline;
    }
  `]
})
export class ResumeAnalysisComponent {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly analysisService = inject(AnalysisService);
  readonly selectedFile = signal<File | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<ResumeAnalysis | null>(this.analysisService.result());

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.result.set(null);
    this.error.set('');
    if (!file) { this.selectedFile.set(null); return; }
    if (!/\.(pdf|docx)$/i.test(file.name)) { this.error.set('Choose a PDF or DOCX resume.'); this.selectedFile.set(null); return; }
    if (file.size > 5 * 1024 * 1024) { this.error.set('The resume must be 5 MB or smaller.'); this.selectedFile.set(null); return; }
    this.selectedFile.set(file);
  }

  analyze(): void {
    const file = this.selectedFile();
    if (!file || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.ai.analyzeResume(file).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (analysis: ResumeAnalysis) => {
        this.result.set(analysis);
        this.analysisService.setResult(analysis);
      },
      error: (err: unknown) => this.error.set(this.auth.messageFor(err))
    });
  }
}
