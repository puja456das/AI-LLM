import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AnalysisService } from '../../core/analysis.service';
import { JobApplication } from '../../core/auth.models';

const PIPELINE_STORAGE_KEY = 'careerpilot_job_pipeline';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dash-inner">
      <header class="dash-header">
        <div>
          <span class="eyebrow">CAREERPILOT AI WORKSPACE</span>
          <h1>A little progress goes a long way.</h1>
        </div>
        <span class="header-date">CAREERPILOT / 01</span>
      </header>

      <section class="welcome-card">
        <div>
          <span class="eyebrow light-eyebrow">YOUR CAREER, IN MOTION</span>
          <h2>Good to have you here, {{ firstName() }}.</h2>
          <p>
            Your next opportunity starts with a clearer picture of your experience. Upload your resume or explore machine-learning matched roles, salary benchmarks, and AI interview prep.
          </p>
          <a routerLink="/resume-analysis" class="welcome-action">
            {{ hasAnalysis() ? 'View Latest Resume Review' : 'Start with your resume' }} <span>→</span>
          </a>
        </div>
        <div class="welcome-art">
          <span class="orbit orbit-one"></span>
          <span class="orbit orbit-two"></span>
          <span class="orbit-core">✦</span>
          <span class="orbit-label">YOUR NEXT<br>CHAPTER</span>
        </div>
      </section>

      <!-- Live Career & Application Pipeline Snapshot -->
      <section class="career-snapshot-card">
        <div class="snapshot-header">
          <div>
            <span class="eyebrow">ACTIVE CAREER MOMENTUM</span>
            <h3>Career Intelligence & Pipeline Status</h3>
          </div>
          <span class="snapshot-tag">LIVE SIGNALS</span>
        </div>

        <div class="snapshot-metrics-grid">
          <div class="metric-block">
            <span class="metric-label">ATS RESUME SCORE</span>
            @if (atsScore()) {
              <div class="metric-val-row">
                <span class="metric-big-num">{{ atsScore() }}</span>
                <span class="metric-badge" [class.high]="atsScore()! >= 80">{{ atsRating() }}</span>
              </div>
              <small class="metric-sub">Analyzed against ATS criteria</small>
            } @else {
              <div class="metric-empty-val">Not analyzed</div>
              <a routerLink="/resume-analysis" class="metric-action-link">Run ATS Check →</a>
            }
          </div>

          <div class="metric-block">
            <span class="metric-label">TOP OCCUPATION MATCH</span>
            @if (topRole()) {
              <strong class="role-highlight-title">{{ topRole()?.title }}</strong>
              <div class="match-pct-pill">{{ topRole()?.similarity_score }}% Match Similarity</div>
            } @else {
              <div class="metric-empty-val">No roles matched yet</div>
              <a routerLink="/jobs" class="metric-action-link">Explore O*NET Catalog →</a>
            }
          </div>

          <div class="metric-block">
            <span class="metric-label">SKILLS RECOGNIZED</span>
            <div class="metric-val-row">
              <span class="metric-big-num">{{ detectedSkillsCount() }}</span>
              <span class="metric-unit">software skills</span>
            </div>
            <a routerLink="/skills" class="metric-action-link">View Gap Analysis & Roadmap →</a>
          </div>

          <div class="metric-block pipeline-metric">
            <span class="metric-label">APPLICATION PIPELINE</span>
            <div class="pipeline-mini-counts">
              <span class="pipe-stat"><strong>{{ pipelineCounts().target }}</strong> Target</span>
              <span class="pipe-stat"><strong>{{ pipelineCounts().applied }}</strong> Applied</span>
              <span class="pipe-stat active"><strong>{{ pipelineCounts().interviewing }}</strong> Interviewing</span>
              <span class="pipe-stat offer"><strong>{{ pipelineCounts().offer }}</strong> Offers</span>
            </div>
            <a routerLink="/jobs" class="metric-action-link">Manage Pipeline Tracker →</a>
          </div>
        </div>

        <!-- Quick AI Assistant Action Bar -->
        <div class="assistant-callout">
          <div class="assistant-callout-text">
            <strong>Ready for upcoming interviews?</strong>
            <p>Practice realistic technical and behavioral questions with our conversational AI Interview Chatbot.</p>
          </div>
          <a routerLink="/interview" class="assistant-start-btn">
            <span>◉</span> Open AI Interview Chatbot →
          </a>
        </div>
      </section>

      <section class="section-heading">
        <div>
          <span class="eyebrow">AI POWERED SUITE</span>
          <h2>Explore Career Features</h2>
        </div>
        <span class="quiet-label">DATASET-TRAINED ML</span>
      </section>

      <section class="feature-grid">
        <article class="feature-card">
          <div class="feature-top">
            <span class="feature-icon blue">▤</span>
            <span class="status-tag">STEP 01</span>
          </div>
          <h3>See your resume<br>with fresh eyes.</h3>
          <p>ML-powered extraction detects software skills, evaluates ATS compliance, and identifies occupation family.</p>
          <a routerLink="/resume-analysis">Explore resume review <span>↗</span></a>
          <span class="card-index">01</span>
        </article>

        <article class="feature-card">
          <div class="feature-top">
            <span class="feature-icon peach">⌕</span>
            <span class="status-tag">STEP 02</span>
          </div>
          <h3>Find work that<br>matches you.</h3>
          <p>Discover roles ranked by semantic cosine similarity against 920+ O*NET occupations with salary outlook.</p>
          <a routerLink="/jobs">Explore job matches <span>↗</span></a>
          <span class="card-index">02</span>
        </article>

        <article class="feature-card">
          <div class="feature-top">
            <span class="feature-icon sage">⌁</span>
            <span class="status-tag">STEP 03</span>
          </div>
          <h3>Build what comes<br>next.</h3>
          <p>Turn missing skills into an actionable, prioritized roadmap with progress tracking.</p>
          <a routerLink="/skills">Explore skill plan <span>↗</span></a>
          <span class="card-index">03</span>
        </article>

        <article class="feature-card">
          <div class="feature-top">
            <span class="feature-icon blue">◉</span>
            <span class="status-tag">STEP 04</span>
          </div>
          <h3>Ace technical &<br>behavioral interviews.</h3>
          <p>Practice realistic role questions with an interactive conversational AI Chatbot with instant feedback.</p>
          <a routerLink="/interview">Practice interviews <span>↗</span></a>
          <span class="card-index">04</span>
        </article>
      </section>

      <footer class="dashboard-footer">
        <span>Built around your potential <b>✦</b></span>
        <span>SMALL STEPS. MEANINGFUL MOMENTUM.</span>
      </footer>
    </div>
  `,
  styles: [`
    .dash-inner {
      width: 100%;
    }
    .career-snapshot-card {
      background: #ffffff;
      border: 1px solid #e1e7ee;
      border-radius: 8px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 2px 8px rgba(16, 35, 63, 0.03);
    }
    .snapshot-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .snapshot-header h3 {
      font: 700 20px 'Manrope', sans-serif;
      color: #172b45;
      margin: 4px 0 0;
      letter-spacing: -0.5px;
    }
    .snapshot-tag {
      font-size: 9px;
      font-weight: 700;
      background: #eff6ff;
      color: #1d4ed8;
      padding: 4px 8px;
      border-radius: 4px;
      letter-spacing: 0.8px;
    }
    .snapshot-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .metric-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .metric-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .metric-val-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .metric-big-num {
      font: 800 28px 'Manrope', sans-serif;
      color: #162b46;
      line-height: 1;
    }
    .metric-unit {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
    .metric-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 10px;
      background: #eff6ff;
      color: #1d4ed8;
    }
    .metric-badge.high {
      background: #ecfdf5;
      color: #065f46;
    }
    .metric-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .metric-empty-val {
      font-size: 13px;
      color: #94a3b8;
      font-style: italic;
      margin: 6px 0;
    }
    .role-highlight-title {
      font: 700 14px 'Manrope', sans-serif;
      color: #172b45;
      margin-bottom: 4px;
      line-height: 1.3;
    }
    .match-pct-pill {
      font-size: 10px;
      font-weight: 700;
      color: #047857;
      background: #ecfdf5;
      padding: 2px 6px;
      border-radius: 4px;
      width: fit-content;
      margin-bottom: 6px;
    }
    .metric-action-link {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      text-decoration: none;
      margin-top: 10px;
      display: inline-block;
    }
    .metric-action-link:hover {
      text-decoration: underline;
    }
    .pipeline-mini-counts {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin: 6px 0;
    }
    .pipe-stat {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      color: #475569;
    }
    .pipe-stat strong {
      color: #1e293b;
    }
    .pipe-stat.active {
      border-color: #fde68a;
      background: #fffdf5;
      color: #b45309;
    }
    .pipe-stat.offer {
      border-color: #a7f3d0;
      background: #f0fdf4;
      color: #047857;
    }
    .assistant-callout {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0f7ff;
      border: 1px solid #c7ddff;
      border-radius: 6px;
      padding: 14px 18px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .assistant-callout-text strong {
      display: block;
      color: #1e3a8a;
      font-size: 13px;
    }
    .assistant-callout-text p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #3b82f6;
    }
    .assistant-start-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #183c61;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 5px;
      text-decoration: none;
      transition: background 0.2s;
    }
    .assistant-start-btn:hover {
      background: #234c77;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly analysis = inject(AnalysisService);

  readonly name = signal(this.auth.user()?.full_name ?? 'Career Explorer');
  readonly firstName = signal(this.name().split(' ')[0]);
  readonly hasAnalysis = signal(!!this.analysis.result());

  readonly atsScore = computed(() => this.analysis.result()?.ats_scorecard?.score);
  readonly atsRating = computed(() => this.analysis.result()?.ats_scorecard?.rating ?? 'Good');
  readonly topRole = computed(() => this.analysis.result()?.recommendations?.[0]);
  readonly detectedSkillsCount = computed(() => this.analysis.result()?.recognized_software_skills?.length ?? 0);

  readonly pipelineCounts = signal<{ target: number; applied: number; interviewing: number; offer: number }>({
    target: 0,
    applied: 0,
    interviewing: 0,
    offer: 0
  });

  ngOnInit(): void {
    this.refreshPipelineCounts();
  }

  refreshPipelineCounts(): void {
    try {
      const saved = localStorage.getItem(PIPELINE_STORAGE_KEY);
      if (saved) {
        const jobs: JobApplication[] = JSON.parse(saved);
        this.pipelineCounts.set({
          target: jobs.filter((j) => j.stage === 'target').length,
          applied: jobs.filter((j) => j.stage === 'applied').length,
          interviewing: jobs.filter((j) => j.stage === 'interviewing').length,
          offer: jobs.filter((j) => j.stage === 'offer').length
        });
      }
    } catch {}
  }
}
