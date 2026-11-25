import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalysisService } from '../../core/analysis.service';
import { RoleRecommendation } from '../../core/auth.models';

interface SkillItem {
  name: string;
  category: 'core' | 'priority' | 'secondary';
  status: 'to_learn' | 'in_progress' | 'mastered';
}

const SKILL_PROGRESS_STORAGE = 'careerpilot_skill_progress';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="skills-page">
      <div class="page-header">
        <div>
          <span class="eyebrow">CAREER ROADMAP · DATASET-DERIVED SKILL PLAN</span>
          <h1>Personalized Skill Plan & Gap Analysis</h1>
          <p class="subtitle">
            Derived by comparing your resume's detected technologies against O*NET occupational benchmarks.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/resume-analysis" class="action-btn">
            <span>▤</span> {{ hasAnalysis() ? 'Update Resume' : 'Upload Resume' }}
          </a>
        </div>
      </div>

      @if (hasAnalysis()) {
        <!-- Top Summary Cards -->
        <div class="overview-grid">
          <div class="summary-card readiness-card">
            <div class="metric-heading">
              <span class="eyebrow light-eyebrow">OVERALL SKILL READINESS</span>
              <span class="readiness-pct">{{ readinessScore() }}%</span>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" [style.width.%]="readinessScore()"></div>
            </div>
            <p class="readiness-desc">
              You match <strong>{{ totalMatchedSkills() }}</strong> core software skills across your recommended occupation profiles, with <strong>{{ totalMissingSkills() }}</strong> priority skills to build.
            </p>
          </div>

          <div class="summary-card stats-card">
            <span class="eyebrow">VERIFIED TECHNOLOGIES</span>
            <div class="stat-big">{{ recognizedSkills().length }}</div>
            <span class="stat-subtitle">Skills detected from your resume</span>
            <div class="quick-chips">
              @for (s of recognizedSkills().slice(0, 5); track s) {
                <span class="mini-chip">{{ s }}</span>
              }
              @if (recognizedSkills().length > 5) {
                <span class="mini-chip more">+{{ recognizedSkills().length - 5 }} more</span>
              }
            </div>
          </div>
        </div>

        <!-- Role Target Selector -->
        <div class="target-role-bar">
          <div class="bar-left">
            <span class="label">TARGET OCCUPATION:</span>
            <select
              [value]="selectedRoleIndex()"
              (change)="onRoleChange($event)"
              class="role-select"
            >
              @for (role of recommendations(); track role.soc_code; let idx = $index) {
                <option [value]="idx">
                  {{ role.title }} ({{ role.similarity_score }}% ML Match)
                </option>
              }
            </select>
          </div>
          <div class="bar-right">
            @if (currentRole(); as role) {
              <span class="role-family-label">{{ role.family }} · {{ role.soc_code }}</span>
            }
          </div>
        </div>

        <!-- Current Target Role Deep Dive -->
        @if (currentRole(); as role) {
          <div class="role-deep-dive">
            <div class="role-dive-header">
              <div>
                <h2>{{ role.title }}</h2>
                <p>Role Match Similarity: <strong>{{ role.similarity_score }}%</strong></p>
              </div>
              <div class="role-readiness">
                <span>Role Competency Coverage</span>
                <strong>{{ calculateRoleReadiness(role) }}%</strong>
              </div>
            </div>

            <!-- Skills Gap & Roadmap Section -->
            <div class="plan-columns">
              <!-- Column 1: Priority Skills to Build -->
              <div class="plan-card">
                <div class="plan-card-header">
                  <h3>
                    <span class="dot orange"></span>
                    Priority Skills to Build ({{ role.missing_skills.length }})
                  </h3>
                  <small>Interactive tracker — click to update status</small>
                </div>

                <div class="interactive-skill-list">
                  @for (skill of role.missing_skills; track skill) {
                    <div class="skill-row">
                      <div class="skill-info">
                        <span class="skill-title">{{ skill }}</span>
                        <span class="skill-tag priority">Priority Gap</span>
                      </div>
                      <div class="status-selector">
                        <button
                          class="status-pill"
                          [class.active]="getSkillStatus(skill) === 'to_learn'"
                          (click)="setSkillStatus(skill, 'to_learn')"
                        >
                          To Learn
                        </button>
                        <button
                          class="status-pill in-prog"
                          [class.active]="getSkillStatus(skill) === 'in_progress'"
                          (click)="setSkillStatus(skill, 'in_progress')"
                        >
                          In Progress
                        </button>
                        <button
                          class="status-pill done"
                          [class.active]="getSkillStatus(skill) === 'mastered'"
                          (click)="setSkillStatus(skill, 'mastered')"
                        >
                          ✓ Mastered
                        </button>
                      </div>
                    </div>
                  }
                  @if (role.missing_skills.length === 0) {
                    <div class="congrats-card">
                      🎉 You already possess all key software skills for this role!
                    </div>
                  }
                </div>
              </div>

              <!-- Column 2: Skills You Already Have -->
              <div class="plan-card">
                <div class="plan-card-header">
                  <h3>
                    <span class="dot green"></span>
                    Skills Already Verified ({{ role.matching_skills.length }})
                  </h3>
                  <small>Detected from your work experience</small>
                </div>

                <div class="verified-skill-grid">
                  @for (skill of role.matching_skills; track skill) {
                    <div class="verified-skill-card">
                      <span class="check-icon">✓</span>
                      <div>
                        <strong>{{ skill }}</strong>
                        <small>Matches O*NET benchmark</small>
                      </div>
                    </div>
                  }
                  @if (role.matching_skills.length === 0) {
                    <p class="empty-text">No listed software skills from this role matched your resume.</p>
                  }
                </div>
              </div>
            </div>

            <!-- Structured 3-Phase Action Plan -->
            <div class="roadmap-card">
              <span class="eyebrow">RECOMMENDED ACTION PLAN</span>
              <h2>Step-by-Step Learning Milestones for {{ role.title }}</h2>

              <div class="milestones-grid">
                <div class="milestone-box">
                  <div class="milestone-num">01</div>
                  <h4>Core Competency Gap</h4>
                  <p>
                    Dedicate 2-3 weeks to master the highest-priority missing technologies:
                    <strong>{{ role.missing_skills.slice(0, 2).join(', ') || 'Framework fundamentals' }}</strong>.
                  </p>
                </div>

                <div class="milestone-box">
                  <div class="milestone-num">02</div>
                  <h4>Hands-on Production Project</h4>
                  <p>
                    Build a real-world application integrating both your verified skills ({{ role.matching_skills.slice(0, 2).join(', ') || 'existing stack' }}) and new target tools.
                  </p>
                </div>

                <div class="milestone-box">
                  <div class="milestone-num">03</div>
                  <h4>Interview & Portfolio Proof</h4>
                  <p>
                    Practice role-tailored technical and behavioral scenarios in CareerPilot's Interview Practice to showcase your new capabilities.
                  </p>
                  <a [routerLink]="['/interview']" [queryParams]="{ role: role.title }" class="plan-link">
                    Practice Interview for this Role →
                  </a>
                </div>
              </div>
            </div>
          </div>
        }
      } @else {
        <!-- Empty state when no resume analysis exists -->
        <div class="empty-state-card">
          <div class="empty-icon">⌁</div>
          <h2>No Resume Analyzed Yet</h2>
          <p>
            Upload your resume so CareerPilot can detect your existing software competencies and calculate your exact skill gap against standard occupation profiles.
          </p>
          <a routerLink="/resume-analysis" class="btn-primary">
            Upload Resume for Skill Analysis →
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    .skills-page {
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
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #183c61;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 10px 16px;
      border-radius: 5px;
      transition: background 0.2s;
    }
    .action-btn:hover { background: #28557f; }
    .overview-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
    }
    .readiness-card {
      background: linear-gradient(135deg, #183553 0%, #1e456e 100%);
      color: #fff;
    }
    .metric-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .readiness-pct {
      font: 800 36px 'Manrope', sans-serif;
      color: #10b981;
    }
    .progress-bar-wrap {
      background: rgba(255, 255, 255, 0.15);
      height: 8px;
      border-radius: 4px;
      margin: 14px 0;
      overflow: hidden;
    }
    .progress-bar-fill {
      background: #10b981;
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }
    .readiness-desc {
      font-size: 12px;
      line-height: 1.7;
      color: #cbd5e1;
      margin: 0;
    }
    .readiness-desc strong {
      color: #fff;
    }
    .stats-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .stat-big {
      font: 800 38px 'Manrope', sans-serif;
      color: #1e3a5f;
      margin: 4px 0;
    }
    .stat-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .mini-chip {
      background: #f1f5f9;
      color: #334155;
      font-size: 9px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .mini-chip.more {
      background: #e2e8f0;
      color: #475569;
    }
    .target-role-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 18px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bar-left .label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #64748b;
    }
    .role-select {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      outline: none;
      cursor: pointer;
    }
    .role-family-label {
      font-size: 11px;
      color: #64748b;
    }
    .role-deep-dive {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .role-dive-header {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .role-dive-header h2 {
      font: 700 20px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0 0 4px;
    }
    .role-dive-header p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    .role-readiness {
      text-align: right;
    }
    .role-readiness span {
      display: block;
      font-size: 10px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .role-readiness strong {
      font: 800 22px 'Manrope', sans-serif;
      color: #059669;
    }
    .plan-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .plan-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
    }
    .plan-card-header {
      margin-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 10px;
    }
    .plan-card-header h3 {
      font: 700 16px 'Manrope', sans-serif;
      color: #1e293b;
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .plan-card-header small {
      font-size: 11px;
      color: #64748b;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .dot.orange { background: #f59e0b; }
    .dot.green { background: #10b981; }
    .interactive-skill-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      gap: 10px;
      flex-wrap: wrap;
    }
    .skill-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .skill-title {
      font-weight: 700;
      font-size: 12px;
      color: #1e293b;
    }
    .skill-tag.priority {
      background: #fef3c7;
      color: #92400e;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .status-selector {
      display: flex;
      gap: 4px;
    }
    .status-pill {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      padding: 4px 8px;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
    }
    .status-pill.active {
      background: #f1f5f9;
      color: #0f172a;
      border-color: #64748b;
    }
    .status-pill.in-prog.active {
      background: #dbeafe;
      color: #1e40af;
      border-color: #93c5fd;
    }
    .status-pill.done.active {
      background: #dcfce7;
      color: #166534;
      border-color: #86efac;
    }
    .verified-skill-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }
    .verified-skill-card {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .check-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #10b981;
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 700;
    }
    .verified-skill-card strong {
      display: block;
      font-size: 11px;
      color: #14532d;
    }
    .verified-skill-card small {
      display: block;
      font-size: 9px;
      color: #15803d;
    }
    .roadmap-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
    }
    .roadmap-card h2 {
      font: 700 18px 'Manrope', sans-serif;
      color: #1e293b;
      margin: 6px 0 16px;
    }
    .milestones-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    .milestone-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 18px;
      display: flex;
      flex-direction: column;
    }
    .milestone-num {
      font: 800 20px 'Manrope', sans-serif;
      color: #3b82f6;
      margin-bottom: 8px;
    }
    .milestone-box h4 {
      font: 700 14px 'Manrope', sans-serif;
      color: #1e293b;
      margin: 0 0 6px;
    }
    .milestone-box p {
      font-size: 11px;
      line-height: 1.6;
      color: #64748b;
      margin: 0;
      flex: 1;
    }
    .plan-link {
      display: inline-block;
      margin-top: 12px;
      color: #2563eb;
      font-size: 10px;
      font-weight: 700;
    }
    .empty-state-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 45px 30px;
      text-align: center;
    }
    .empty-icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #eef3f8;
      color: #2b4f77;
      font-size: 24px;
      display: grid;
      place-items: center;
      margin: 0 auto 16px;
    }
    .empty-state-card h2 {
      font: 700 22px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0 0 10px;
    }
    .empty-state-card p {
      font-size: 13px;
      color: #64748b;
      max-width: 550px;
      line-height: 1.6;
      margin: 0 auto 20px;
    }
    .btn-primary {
      display: inline-block;
      background: #183c61;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      padding: 11px 20px;
      border-radius: 5px;
    }
    @media (max-width: 900px) {
      .overview-grid, .plan-columns, .milestones-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SkillsComponent implements OnInit {
  private readonly analysisService = inject(AnalysisService);
  private readonly route = inject(ActivatedRoute);

  readonly analysis = this.analysisService.result;
  readonly hasAnalysis = computed(() => !!this.analysis());

  readonly selectedRoleIndex = signal<number>(0);
  readonly skillStatusMap = signal<Record<string, 'to_learn' | 'in_progress' | 'mastered'>>({});

  readonly recommendations = computed(() => this.analysis()?.recommendations ?? []);
  readonly recognizedSkills = computed(() => this.analysis()?.recognized_software_skills ?? []);

  readonly currentRole = computed(() => {
    const list = this.recommendations();
    const idx = this.selectedRoleIndex();
    return list[idx] ?? list[0] ?? null;
  });

  readonly totalMatchedSkills = computed(() => {
    const set = new Set<string>();
    for (const r of this.recommendations()) {
      for (const s of r.matching_skills) set.add(s.toLowerCase());
    }
    return set.size;
  });

  readonly totalMissingSkills = computed(() => {
    const set = new Set<string>();
    for (const r of this.recommendations()) {
      for (const s of r.missing_skills) set.add(s.toLowerCase());
    }
    return set.size;
  });

  readonly readinessScore = computed(() => {
    const matched = this.totalMatchedSkills();
    const missing = this.totalMissingSkills();
    if (matched + missing === 0) return 0;
    return Math.round((matched / (matched + missing)) * 100);
  });

  ngOnInit(): void {
    this.loadSkillStatus();
    // Check if a role was passed in queryParams
    this.route.queryParams.subscribe((params) => {
      const targetRole = params['role'];
      if (targetRole) {
        const idx = this.recommendations().findIndex(
          (r) => r.title.toLowerCase() === targetRole.toLowerCase()
        );
        if (idx !== -1) {
          this.selectedRoleIndex.set(idx);
        }
      }
    });
  }

  onRoleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedRoleIndex.set(Number(target.value));
  }

  calculateRoleReadiness(role: RoleRecommendation): number {
    const matched = role.matching_skills.length;
    const missing = role.missing_skills.length;
    if (matched + missing === 0) return 100;
    return Math.round((matched / (matched + missing)) * 100);
  }

  getSkillStatus(skillName: string): 'to_learn' | 'in_progress' | 'mastered' {
    return this.skillStatusMap()[skillName.toLowerCase()] || 'to_learn';
  }

  setSkillStatus(skillName: string, status: 'to_learn' | 'in_progress' | 'mastered'): void {
    const updated = { ...this.skillStatusMap(), [skillName.toLowerCase()]: status };
    this.skillStatusMap.set(updated);
    try {
      localStorage.setItem(SKILL_PROGRESS_STORAGE, JSON.stringify(updated));
    } catch {}
  }

  private loadSkillStatus(): void {
    try {
      const data = localStorage.getItem(SKILL_PROGRESS_STORAGE);
      if (data) {
        this.skillStatusMap.set(JSON.parse(data));
      }
    } catch {}
  }
}
