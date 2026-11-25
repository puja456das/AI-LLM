import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AnalysisService } from '../../core/analysis.service';
import { AiService, PopularRoleItem } from '../../core/ai.service';
import { RoleRecommendation, JobApplication, ApplicationStage } from '../../core/auth.models';

const PIPELINE_STORAGE_KEY = 'careerpilot_job_pipeline';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="jobs-container">
      <div class="page-header">
        <div>
          <span class="eyebrow">AI & MACHINE LEARNING · OCCUPATION MATCHING & TRACKER</span>
          <h1>Job Matches & Application Pipeline</h1>
          <p class="subtitle">
            Personalized role recommendations ranked by text similarity against 920+ official O*NET occupation profiles with salary benchmarks and active pipeline tracking.
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/resume-analysis" class="action-btn">
            <span>▤</span> {{ hasAnalysis() ? 'Re-analyze Resume' : 'Upload Resume' }}
          </a>
        </div>
      </div>

      <!-- Main Navigation Tabs: Recommendations vs Application Tracker -->
      <div class="view-tabs">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'matches'"
          (click)="activeTab.set('matches')"
        >
          <span>⌕ Recommended Matches</span>
          <span class="tab-count">{{ totalMatches() }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'tracker'"
          (click)="activeTab.set('tracker')"
        >
          <span>📋 Application Pipeline Tracker</span>
          <span class="tab-count highlight">{{ pipelineJobs().length }}</span>
        </button>
      </div>

      <!-- TAB 1: RECOMMENDED MATCHES -->
      @if (activeTab() === 'matches') {
        @if (hasAnalysis()) {
          <div class="meta-strip">
            <div class="meta-pill">
              <span class="label">DETECTED FAMILY</span>
              <strong>{{ analysis()?.detected_family?.name }}</strong>
              <small>({{ analysis()?.detected_family?.confidence }}% confidence)</small>
            </div>
            <div class="meta-pill">
              <span class="label">RECOGNIZED SKILLS</span>
              <strong>{{ analysis()?.recognized_software_skills?.length ?? 0 }} skills</strong>
            </div>
            <div class="meta-pill">
              <span class="label">MODEL</span>
              <strong>TF-IDF + Cosine Sim</strong>
            </div>
            <div class="meta-pill">
              <span class="label">IN APPLICATION PIPELINE</span>
              <strong>{{ pipelineJobs().length }} roles saved</strong>
            </div>
          </div>

          <div class="filter-bar">
            <div class="search-box">
              <span>⌕</span>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Filter matched roles by title, SOC code, or skill..."
              />
            </div>
            <div class="filter-buttons">
              <button
                [class.active]="filterThreshold() === 0"
                (click)="filterThreshold.set(0)"
              >
                All Matches ({{ totalMatches() }})
              </button>
              <button
                [class.active]="filterThreshold() === 70"
                (click)="filterThreshold.set(70)"
              >
                Strong (≥ 70%)
              </button>
              <button
                [class.active]="filterThreshold() === 80"
                (click)="filterThreshold.set(80)"
              >
                Top Matches (≥ 80%)
              </button>
            </div>
          </div>

          <div class="roles-grid">
            @for (role of filteredRoles(); track role.soc_code) {
              <div class="job-card">
                <div class="card-top">
                  <div>
                    <div class="badge-row">
                      <span class="soc-tag">{{ role.soc_code }}</span>
                      <span class="family-tag">{{ role.family }}</span>
                    </div>
                    <h3>{{ role.title }}</h3>
                  </div>
                  <div class="score-badge" [class.high]="role.similarity_score >= 75">
                    <span class="score-value">{{ role.similarity_score }}%</span>
                    <span class="score-label">ML Match</span>
                  </div>
                </div>

                <div class="match-bar">
                  <div class="bar-bg">
                    <div class="bar-fg" [style.width.%]="role.similarity_score"></div>
                  </div>
                </div>

                <!-- Salary Benchmark & Outlook Card Strip -->
                @if (role.salary) {
                  <div class="salary-card-strip">
                    <div class="sal-col">
                      <span class="sal-label">Entry Level</span>
                      <strong class="sal-val">{{ role.salary.entry_level }}</strong>
                    </div>
                    <div class="sal-col median">
                      <span class="sal-label">Median Salary</span>
                      <strong class="sal-val highlight">{{ role.salary.median }}</strong>
                    </div>
                    <div class="sal-col">
                      <span class="sal-label">Senior Level</span>
                      <strong class="sal-val">{{ role.salary.senior }}</strong>
                    </div>
                    <div class="sal-col outlook">
                      <span class="sal-label">Growth Outlook</span>
                      <span class="outlook-badge">{{ role.salary.growth_outlook }}</span>
                    </div>
                  </div>
                }

                <div class="skills-section">
                  <div class="skill-group">
                    <span class="group-title">
                      <span class="dot green"></span> Matching Skills ({{ role.matching_skills.length }})
                    </span>
                    <div class="chip-wrap">
                      @for (skill of role.matching_skills; track skill) {
                        <span class="chip matched">{{ skill }}</span>
                      }
                      @if (role.matching_skills.length === 0) {
                        <span class="muted-note">No listed software skills matched explicitly.</span>
                      }
                    </div>
                  </div>

                  <div class="skill-group">
                    <span class="group-title">
                      <span class="dot orange"></span> Skills to Build ({{ role.missing_skills.length }})
                    </span>
                    <div class="chip-wrap">
                      @for (skill of role.missing_skills; track skill) {
                        <span class="chip missing">{{ skill }}</span>
                      }
                      @if (role.missing_skills.length === 0) {
                        <span class="muted-note">You already cover the priority skills!</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="card-footer">
                  <div class="footer-left">
                    <button class="footer-btn primary" (click)="practiceInterview(role)">
                      <span>◉</span> AI Interview Chatbot
                    </button>
                    <button class="footer-btn secondary" (click)="viewSkillPlan(role)">
                      <span>⌁</span> Skill Roadmap
                    </button>
                  </div>

                  <div class="footer-right">
                    @if (isJobTracked(role.soc_code)) {
                      <div class="tracked-status-pill">
                        <span class="status-indicator"></span>
                        <span>Saved ({{ getTrackedStage(role.soc_code) | uppercase }})</span>
                        <button class="small-text-btn" (click)="openTrackerTab()">View in Tracker →</button>
                      </div>
                    } @else {
                      <button class="footer-btn tracker-btn" (click)="addToPipeline(role)">
                        <span>+</span> Add to Tracker
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
            @if (filteredRoles().length === 0) {
              <div class="empty-results">
                <p>No job matches found matching "<strong>{{ searchQuery }}</strong>".</p>
                <button (click)="searchQuery = ''" class="reset-btn">Reset search</button>
              </div>
            }
          </div>
        } @else {
          <!-- Empty state when no resume has been uploaded yet -->
          <div class="empty-state-card">
            <div class="empty-icon">⌕</div>
            <h2>No Resume Analyzed Yet</h2>
            <p>
              Upload your resume to let our machine learning model analyze your experience, detect your software skills, and compute semantic text similarity against 920+ O*NET occupation profiles.
            </p>
            <a routerLink="/resume-analysis" class="btn-primary">
              Upload Resume for ML Matching →
            </a>
          </div>

          <div class="catalog-section">
            <div class="section-title">
              <span class="eyebrow">EXPLORE O*NET ROLES</span>
              <h2>Popular In-Demand Technology & Data Roles</h2>
              <p>You can browse standard roles from our training dataset while you prepare your resume.</p>
            </div>

            <div class="catalog-grid">
              @for (item of popularRoles(); track item.soc_code) {
                <div class="catalog-card">
                  <div class="catalog-header">
                    <span class="soc-tag">{{ item.soc_code }}</span>
                    <h4>{{ item.title }}</h4>
                  </div>
                  <div class="catalog-skills">
                    <small>Key software technologies:</small>
                    <div class="chip-wrap">
                      @for (s of item.skills; track s) {
                        <span class="chip sample">{{ s }}</span>
                      }
                    </div>
                  </div>
                  <div class="catalog-actions">
                    <button (click)="practiceRole(item.title, item.skills)" class="text-action">
                      Practice Interview with AI →
                    </button>
                    <button (click)="addCatalogToTracker(item)" class="text-action tracker">
                      + Add to Tracker
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- TAB 2: APPLICATION PIPELINE TRACKER -->
      @if (activeTab() === 'tracker') {
        <div class="tracker-shell">
          <div class="tracker-header">
            <div>
              <h3>Career Application Pipeline Board</h3>
              <p>Track your target positions through every stage of your job hunt.</p>
            </div>
            <div class="tracker-header-actions">
              <button class="add-custom-btn" (click)="toggleAddCustomModal()">
                + Add Custom Role
              </button>
            </div>
          </div>

          <!-- Add Custom Job Form (Collapsible) -->
          @if (showAddCustom()) {
            <div class="custom-job-form">
              <h4>Add New Job Opportunity</h4>
              <div class="form-row">
                <input
                  type="text"
                  [(ngModel)]="customTitle"
                  placeholder="Job Title (e.g. Senior Frontend Engineer)"
                  class="form-input"
                />
                <input
                  type="text"
                  [(ngModel)]="customCompany"
                  placeholder="Company Name (e.g. Google, Stripe)"
                  class="form-input"
                />
              </div>
              <div class="form-row">
                <input
                  type="text"
                  [(ngModel)]="customSalary"
                  placeholder="Salary or Compensation (e.g. $130,000)"
                  class="form-input"
                />
                <select [(ngModel)]="customStage" class="form-select">
                  <option value="target">Target / Saved</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer</option>
                </select>
              </div>
              <div class="form-actions">
                <button class="save-custom-btn" (click)="saveCustomJob()">Add to Pipeline</button>
                <button class="cancel-btn" (click)="showAddCustom.set(false)">Cancel</button>
              </div>
            </div>
          }

          <!-- Kanban Pipeline Columns -->
          <div class="pipeline-columns">
            <!-- Target Column -->
            <div class="pipeline-column">
              <div class="column-header">
                <span class="col-dot target"></span>
                <span class="col-title">Target / Saved</span>
                <span class="col-badge">{{ getJobsByStage('target').length }}</span>
              </div>
              <div class="column-cards">
                @for (job of getJobsByStage('target'); track job.id) {
                  <div class="pipeline-card">
                    <div class="card-head">
                      <h4>{{ job.title }}</h4>
                      <button class="delete-btn" (click)="removeJob(job.id)" title="Remove from pipeline">✕</button>
                    </div>
                    <div class="card-meta">
                      <span class="company-name">{{ job.company || 'O*NET Matched Role' }}</span>
                      @if (job.salary) {
                        <span class="salary-pill">{{ job.salary }}</span>
                      }
                    </div>
                    <div class="card-stage-selector">
                      <label>Stage:</label>
                      <select [value]="job.stage" (change)="onStageChange(job.id, $event)">
                        <option value="target">Target</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div class="card-actions">
                      <button class="pipeline-act-btn" (click)="practiceRole(job.title, [])">
                        <span>◉</span> Interview Prep
                      </button>
                    </div>
                  </div>
                }
                @if (getJobsByStage('target').length === 0) {
                  <div class="column-empty">No target roles saved yet.</div>
                }
              </div>
            </div>

            <!-- Applied Column -->
            <div class="pipeline-column">
              <div class="column-header">
                <span class="col-dot applied"></span>
                <span class="col-title">Applied</span>
                <span class="col-badge">{{ getJobsByStage('applied').length }}</span>
              </div>
              <div class="column-cards">
                @for (job of getJobsByStage('applied'); track job.id) {
                  <div class="pipeline-card">
                    <div class="card-head">
                      <h4>{{ job.title }}</h4>
                      <button class="delete-btn" (click)="removeJob(job.id)">✕</button>
                    </div>
                    <div class="card-meta">
                      <span class="company-name">{{ job.company || 'Direct Application' }}</span>
                      @if (job.salary) {
                        <span class="salary-pill">{{ job.salary }}</span>
                      }
                    </div>
                    <div class="card-stage-selector">
                      <label>Stage:</label>
                      <select [value]="job.stage" (change)="onStageChange(job.id, $event)">
                        <option value="target">Target</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div class="card-actions">
                      <button class="pipeline-act-btn" (click)="practiceRole(job.title, [])">
                        <span>◉</span> Interview Prep
                      </button>
                    </div>
                  </div>
                }
                @if (getJobsByStage('applied').length === 0) {
                  <div class="column-empty">No applications submitted yet.</div>
                }
              </div>
            </div>

            <!-- Interviewing Column -->
            <div class="pipeline-column">
              <div class="column-header">
                <span class="col-dot interviewing"></span>
                <span class="col-title">Interviewing</span>
                <span class="col-badge">{{ getJobsByStage('interviewing').length }}</span>
              </div>
              <div class="column-cards">
                @for (job of getJobsByStage('interviewing'); track job.id) {
                  <div class="pipeline-card highlight-card">
                    <div class="card-head">
                      <h4>{{ job.title }}</h4>
                      <button class="delete-btn" (click)="removeJob(job.id)">✕</button>
                    </div>
                    <div class="card-meta">
                      <span class="company-name">{{ job.company || 'Interview in Progress' }}</span>
                      @if (job.salary) {
                        <span class="salary-pill">{{ job.salary }}</span>
                      }
                    </div>
                    <div class="card-stage-selector">
                      <label>Stage:</label>
                      <select [value]="job.stage" (change)="onStageChange(job.id, $event)">
                        <option value="target">Target</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div class="card-actions">
                      <button class="pipeline-act-btn primary" (click)="practiceRole(job.title, [])">
                        <span>◉</span> Practice Now with AI Chatbot →
                      </button>
                    </div>
                  </div>
                }
                @if (getJobsByStage('interviewing').length === 0) {
                  <div class="column-empty">No active interviews scheduled.</div>
                }
              </div>
            </div>

            <!-- Offer Column -->
            <div class="pipeline-column">
              <div class="column-header">
                <span class="col-dot offer"></span>
                <span class="col-title">Offers & Final</span>
                <span class="col-badge">{{ getJobsByStage('offer').length }}</span>
              </div>
              <div class="column-cards">
                @for (job of getJobsByStage('offer'); track job.id) {
                  <div class="pipeline-card offer-card">
                    <div class="card-head">
                      <h4>{{ job.title }}</h4>
                      <button class="delete-btn" (click)="removeJob(job.id)">✕</button>
                    </div>
                    <div class="card-meta">
                      <span class="company-name">{{ job.company || 'Offer Received' }}</span>
                      @if (job.salary) {
                        <span class="salary-pill highlight">{{ job.salary }}</span>
                      }
                    </div>
                    <div class="card-stage-selector">
                      <label>Stage:</label>
                      <select [value]="job.stage" (change)="onStageChange(job.id, $event)">
                        <option value="target">Target</option>
                        <option value="applied">Applied</option>
                        <option value="interviewing">Interviewing</option>
                        <option value="offer">Offer</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                }
                @if (getJobsByStage('offer').length === 0) {
                  <div class="column-empty">No offers yet. Keep momentum!</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .jobs-container {
      max-width: 1120px;
      margin: 0 auto;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
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
    .action-btn:hover {
      background: #28557f;
    }

    /* Tab Switcher */
    .view-tabs {
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

    .meta-strip {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .meta-pill {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-pill .label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #8a99ad;
    }
    .meta-pill strong {
      color: #1b2f48;
      font-size: 12px;
    }
    .meta-pill small {
      color: #64748b;
    }
    .filter-bar {
      display: flex;
      gap: 14px;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fff;
      border: 1px solid #dfe5ed;
      border-radius: 5px;
      padding: 0 12px;
      height: 40px;
      flex: 1;
      min-width: 260px;
    }
    .search-box span {
      color: #8b99aa;
    }
    .search-box input {
      border: 0;
      outline: none;
      width: 100%;
      font-size: 12px;
      color: #1f334d;
    }
    .filter-buttons {
      display: flex;
      gap: 6px;
    }
    .filter-buttons button {
      background: #fff;
      border: 1px solid #dfe5ed;
      border-radius: 5px;
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 600;
      color: #617285;
      transition: all 0.2s;
    }
    .filter-buttons button.active {
      background: #183c61;
      color: #fff;
      border-color: #183c61;
    }
    .roles-grid {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .job-card {
      background: #fff;
      border: 1px solid #e5eaf0;
      border-radius: 8px;
      padding: 20px 22px;
      box-shadow: 0 2px 6px rgba(16, 35, 63, 0.03);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .badge-row {
      display: flex;
      gap: 8px;
      margin-bottom: 6px;
      align-items: center;
    }
    .soc-tag {
      background: #eef3f8;
      color: #2b4f77;
      font-size: 9px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .family-tag {
      color: #718296;
      font-size: 10px;
      font-weight: 600;
    }
    .card-top h3 {
      font: 700 18px 'Manrope', sans-serif;
      color: #162a43;
      margin: 0;
    }
    .score-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f1f5f9;
      border-radius: 6px;
      padding: 6px 12px;
      min-width: 65px;
    }
    .score-badge.high {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .score-value {
      font: 800 17px 'Manrope', sans-serif;
      color: #1e3a5f;
    }
    .score-label {
      font-size: 8px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .match-bar {
      margin: 12px 0 16px;
    }
    .bar-bg {
      background: #f1f5f9;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-fg {
      background: linear-gradient(90deg, #3b82f6, #10b981);
      height: 100%;
      border-radius: 3px;
    }

    /* Salary card strip */
    .salary-card-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
    }
    .sal-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sal-label {
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sal-val {
      font: 700 13px 'Manrope', sans-serif;
      color: #1e293b;
    }
    .sal-val.highlight {
      color: #1d4ed8;
      font-size: 14px;
    }
    .outlook-badge {
      background: #ecfdf5;
      color: #047857;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }

    .skills-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .skill-group {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .group-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 8px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot.green { background: #10b981; }
    .dot.orange { background: #f59e0b; }
    .chip-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .chip {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .chip.matched {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .chip.missing {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .chip.sample {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #dbeafe;
    }
    .muted-note {
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .footer-left {
      display: flex;
      gap: 8px;
    }
    .footer-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 700;
      padding: 8px 14px;
      border: 0;
      cursor: pointer;
      transition: all 0.2s;
    }
    .footer-btn.primary {
      background: #183c61;
      color: #fff;
    }
    .footer-btn.primary:hover {
      background: #234c77;
    }
    .footer-btn.secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .footer-btn.secondary:hover {
      background: #e2e8f0;
    }
    .footer-btn.tracker-btn {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    .footer-btn.tracker-btn:hover {
      background: #d1fae5;
    }
    .tracked-status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #047857;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 6px 10px;
      border-radius: 5px;
    }
    .status-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
    }
    .small-text-btn {
      background: transparent;
      border: 0;
      color: #2563eb;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
      padding: 0 0 0 4px;
    }

    /* Tracker Tab styles */
    .tracker-shell {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 22px;
    }
    .tracker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .tracker-header h3 {
      font: 700 20px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0 0 4px;
    }
    .tracker-header p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
    }
    .add-custom-btn {
      background: #183c61;
      color: #fff;
      border: 0;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 700;
      padding: 8px 14px;
      cursor: pointer;
    }
    .custom-job-form {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .custom-job-form h4 {
      margin: 0 0 12px;
      font: 700 13px 'Manrope', sans-serif;
      color: #1e293b;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .form-input, .form-select {
      height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 0 12px;
      font-size: 12px;
      color: #1e293b;
      outline: none;
      background: #fff;
    }
    .form-actions {
      display: flex;
      gap: 10px;
    }
    .save-custom-btn {
      background: #10b981;
      color: #fff;
      border: 0;
      border-radius: 5px;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .cancel-btn {
      background: #e2e8f0;
      color: #475569;
      border: 0;
      border-radius: 5px;
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Pipeline Kanban Columns */
    .pipeline-columns {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .pipeline-column {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      min-height: 380px;
      display: flex;
      flex-direction: column;
    }
    .column-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .col-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .col-dot.target { background: #64748b; }
    .col-dot.applied { background: #3b82f6; }
    .col-dot.interviewing { background: #f59e0b; }
    .col-dot.offer { background: #10b981; }
    .col-title {
      font: 700 12px 'Manrope', sans-serif;
      color: #1e293b;
      flex: 1;
    }
    .col-badge {
      background: #e2e8f0;
      color: #475569;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
    }
    .column-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }
    .pipeline-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .pipeline-card.highlight-card {
      border-color: #fde68a;
      background: #fffdf5;
    }
    .pipeline-card.offer-card {
      border-color: #a7f3d0;
      background: #f0fdf4;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 6px;
    }
    .card-head h4 {
      margin: 0;
      font: 700 13px 'Manrope', sans-serif;
      color: #1e293b;
      line-height: 1.3;
    }
    .delete-btn {
      background: transparent;
      border: 0;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
    }
    .delete-btn:hover {
      color: #ef4444;
    }
    .card-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 10px;
    }
    .company-name {
      font-size: 11px;
      color: #64748b;
    }
    .salary-pill {
      font-size: 10px;
      font-weight: 700;
      color: #1d4ed8;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 4px;
      width: fit-content;
    }
    .salary-pill.highlight {
      color: #065f46;
      background: #d1fae5;
    }
    .card-stage-selector {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .card-stage-selector label {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }
    .card-stage-selector select {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 10px;
      padding: 3px 6px;
      background: #fff;
      color: #1e293b;
    }
    .card-actions {
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
    .pipeline-act-btn {
      width: 100%;
      border: 0;
      background: #f1f5f9;
      color: #334155;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      padding: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .pipeline-act-btn.primary {
      background: #183c61;
      color: #fff;
    }
    .column-empty {
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
      text-align: center;
      padding: 20px 8px;
    }

    /* Catalog styles */
    .empty-state-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 36px 24px;
      text-align: center;
      margin-bottom: 30px;
    }
    .empty-icon {
      font-size: 32px;
      color: #2563eb;
      margin-bottom: 12px;
    }
    .btn-primary {
      display: inline-block;
      background: #183c61;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 11px 20px;
      border-radius: 5px;
      margin-top: 12px;
    }
    .catalog-section {
      margin-top: 20px;
    }
    .section-title {
      margin-bottom: 16px;
    }
    .section-title h2 {
      font: 700 20px 'Manrope', sans-serif;
      color: #1e293b;
      margin: 4px 0;
    }
    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }
    .catalog-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .catalog-header h4 {
      font: 700 15px 'Manrope', sans-serif;
      color: #1e293b;
      margin: 6px 0 10px;
    }
    .catalog-skills small {
      font-size: 10px;
      color: #64748b;
      display: block;
      margin-bottom: 6px;
    }
    .catalog-actions {
      margin-top: 14px;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .text-action {
      background: transparent;
      border: 0;
      color: #2563eb;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }
    .text-action.tracker {
      color: #059669;
    }
    .reset-btn {
      background: #183c61;
      color: #fff;
      border: 0;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 11px;
      cursor: pointer;
      margin-top: 8px;
    }
    @media (max-width: 900px) {
      .pipeline-columns {
        grid-template-columns: 1fr 1fr;
      }
      .skills-section {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 600px) {
      .pipeline-columns {
        grid-template-columns: 1fr;
      }
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class JobsComponent implements OnInit {
  private readonly analysisService = inject(AnalysisService);
  private readonly aiService = inject(AiService);
  private readonly router = inject(Router);

  readonly analysis = this.analysisService.result;
  readonly hasAnalysis = computed(() => !!this.analysis());

  readonly activeTab = signal<'matches' | 'tracker'>('matches');
  searchQuery = '';
  readonly filterThreshold = signal<number>(0);
  readonly popularRoles = signal<PopularRoleItem[]>([]);
  readonly pipelineJobs = signal<JobApplication[]>([]);

  // Custom role form state
  readonly showAddCustom = signal(false);
  customTitle = '';
  customCompany = '';
  customSalary = '';
  customStage: ApplicationStage = 'target';

  readonly totalMatches = computed(() => this.analysis()?.recommendations?.length ?? 0);

  readonly filteredRoles = computed<RoleRecommendation[]>(() => {
    const recs = this.analysis()?.recommendations ?? [];
    const query = this.searchQuery.trim().toLowerCase();
    const threshold = this.filterThreshold();

    return recs.filter((role) => {
      if (role.similarity_score < threshold) return false;
      if (!query) return true;
      const inTitle = role.title.toLowerCase().includes(query);
      const inFamily = role.family.toLowerCase().includes(query);
      const inSoc = role.soc_code.toLowerCase().includes(query);
      const inMatching = role.matching_skills.some((s) => s.toLowerCase().includes(query));
      const inMissing = role.missing_skills.some((s) => s.toLowerCase().includes(query));
      return inTitle || inFamily || inSoc || inMatching || inMissing;
    });
  });

  ngOnInit(): void {
    this.loadPipeline();
    if (!this.hasAnalysis()) {
      this.aiService.getPopularRoles().subscribe({
        next: (res) => this.popularRoles.set(res.roles.slice(0, 12)),
        error: () => {}
      });
    }
  }

  loadPipeline(): void {
    try {
      const saved = localStorage.getItem(PIPELINE_STORAGE_KEY);
      if (saved) {
        this.pipelineJobs.set(JSON.parse(saved));
      }
    } catch {
      this.pipelineJobs.set([]);
    }
  }

  savePipeline(jobs: JobApplication[]): void {
    this.pipelineJobs.set(jobs);
    try {
      localStorage.setItem(PIPELINE_STORAGE_KEY, JSON.stringify(jobs));
    } catch {}
  }

  isJobTracked(soc_code: string): boolean {
    return this.pipelineJobs().some((j) => j.soc_code === soc_code);
  }

  getTrackedStage(soc_code: string): string {
    const found = this.pipelineJobs().find((j) => j.soc_code === soc_code);
    return found ? found.stage : '';
  }

  addToPipeline(role: RoleRecommendation): void {
    if (this.isJobTracked(role.soc_code)) return;
    const newJob: JobApplication = {
      id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      soc_code: role.soc_code,
      title: role.title,
      company: 'O*NET: ' + role.family,
      stage: 'target',
      similarity_score: role.similarity_score,
      salary: role.salary ? `Median: ${role.salary.median}` : undefined,
      date_added: new Date().toISOString()
    };
    this.savePipeline([...this.pipelineJobs(), newJob]);
  }

  addCatalogToTracker(item: PopularRoleItem): void {
    if (this.isJobTracked(item.soc_code)) return;
    const newJob: JobApplication = {
      id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      soc_code: item.soc_code,
      title: item.title,
      company: 'Dataset Benchmark',
      stage: 'target',
      date_added: new Date().toISOString()
    };
    this.savePipeline([...this.pipelineJobs(), newJob]);
  }

  getJobsByStage(stage: ApplicationStage): JobApplication[] {
    return this.pipelineJobs().filter((j) => j.stage === stage);
  }

  onStageChange(id: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newStage = select.value as ApplicationStage;
    const updated = this.pipelineJobs().map((job) =>
      job.id === id ? { ...job, stage: newStage } : job
    );
    this.savePipeline(updated);
  }

  removeJob(id: string): void {
    const updated = this.pipelineJobs().filter((job) => job.id !== id);
    this.savePipeline(updated);
  }

  openTrackerTab(): void {
    this.activeTab.set('tracker');
  }

  toggleAddCustomModal(): void {
    this.showAddCustom.update((v) => !v);
  }

  saveCustomJob(): void {
    if (!this.customTitle.trim()) return;
    const newJob: JobApplication = {
      id: 'custom_' + Date.now(),
      soc_code: 'CUSTOM',
      title: this.customTitle.trim(),
      company: this.customCompany.trim() || 'Direct Prospect',
      salary: this.customSalary.trim() || undefined,
      stage: this.customStage,
      date_added: new Date().toISOString()
    };
    this.savePipeline([...this.pipelineJobs(), newJob]);
    this.customTitle = '';
    this.customCompany = '';
    this.customSalary = '';
    this.customStage = 'target';
    this.showAddCustom.set(false);
  }

  practiceInterview(role: RoleRecommendation): void {
    this.router.navigate(['/interview'], {
      queryParams: { role: role.title, soc: role.soc_code }
    });
  }

  viewSkillPlan(role: RoleRecommendation): void {
    this.router.navigate(['/skills'], {
      queryParams: { role: role.title, soc: role.soc_code }
    });
  }

  practiceRole(title: string, skills: string[]): void {
    this.router.navigate(['/interview'], {
      queryParams: { role: title }
    });
  }
}
