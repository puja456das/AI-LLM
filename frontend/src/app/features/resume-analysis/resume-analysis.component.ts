import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AiService } from '../../core/ai.service';
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
        <p class="analysis-intro">Upload a text-based PDF or DOCX. CareerPilot will identify your likely occupation family, recognize software skills, and compare your experience with O*NET role profiles.</p>

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
            <div class="result-heading"><div><span class="eyebrow">YOUR RESULTS</span><h2>A first look at your experience</h2></div><span class="method-tag">TRAINED MODEL + TF-IDF</span></div>
            <article class="family-card">
              <div><span class="eyebrow light-eyebrow">LIKELY OCCUPATION FAMILY</span><h3>{{ analysis.detected_family.name }}</h3><p>Uncalibrated model score: {{ analysis.detected_family.confidence }}%</p></div>
              <div class="family-alternatives"><small>Other possible families</small>@for (family of analysis.alternative_families.slice(1); track family.code) { <span>{{ family.name }} · {{ family.confidence }}%</span> }</div>
            </article>

            <article class="skills-card">
              <div class="result-subhead"><div><span class="eyebrow">SKILLS FOUND</span><h3>Recognized software skills</h3></div><span class="count-pill">{{ analysis.recognized_software_skills.length }}</span></div>
              @if (analysis.recognized_software_skills.length) {
                <div class="skill-chips">@for (skill of analysis.recognized_software_skills; track skill) { <span>{{ skill }}</span> }</div>
              } @else { <p class="muted-copy">No software skills from the dataset vocabulary were explicitly detected. The role suggestions still use the resume text.</p> }
            </article>

            <div class="result-subhead recommendations-title"><div><span class="eyebrow">ROLE EXPLORATION</span><h2>Roles worth exploring</h2><p class="muted-copy">Ranked by text similarity to occupational task profiles.</p></div></div>
            <div class="recommendation-list">
              @for (role of analysis.recommendations; track role.soc_code) {
                <article class="role-card">
                  <div class="role-top"><div><span class="role-family">{{ role.family }} · {{ role.soc_code }}</span><h3>{{ role.title }}</h3></div><div class="similarity"><strong>{{ role.similarity_score }}%</strong><small>text similarity</small></div></div>
                  <div class="similarity-track"><span [style.width.%]="role.similarity_score"></span></div>
                  <div class="role-skills"><div><strong>Skills matched</strong>@if (role.matching_skills.length) { <span>{{ role.matching_skills.join(' · ') }}</span> } @else { <span>No listed software skills matched explicitly.</span> }</div><div><strong>Potential skills to build</strong>@if (role.missing_skills.length) { <span>{{ role.missing_skills.join(' · ') }}</span> } @else { <span>No additional priority software skills listed.</span> }</div></div>
                </article>
              }
            </div>

            <article class="model-card">
              <div><span class="eyebrow">HOW THIS RESULT WAS BUILT</span><h3>{{ analysis.model_info.name }}</h3><p>Trained on {{ analysis.model_info.training_examples.toLocaleString() }} O*NET task statements and evaluated on a held-out set of {{ analysis.model_info.test_examples.toLocaleString() }}. The role catalogue contains {{ analysis.model_info.occupation_profiles.toLocaleString() }} occupation profiles.</p></div>
              <div class="metric-row"><span>Macro precision <strong>{{ (analysis.model_info.precision_macro * 100).toFixed(1) }}%</strong></span><span>Macro recall <strong>{{ (analysis.model_info.recall_macro * 100).toFixed(1) }}%</strong></span><span>Macro F1 <strong>{{ (analysis.model_info.f1_macro * 100).toFixed(1) }}%</strong></span></div>
              <small class="data-credit">Data: {{ analysis.model_info.dataset }} · U.S. Department of Labor, Employment and Training Administration · CC BY 4.0. CareerPilot's transformed model and profiles are not endorsed by the source.</small>
              <p class="disclaimer">{{ analysis.notice }} Occupational information is based on U.S. job data; use it as a starting point, not a hiring prediction.</p>
            </article>
          </section>
        }
      </main>
    </div>
  `
})
export class ResumeAnalysisComponent {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  readonly selectedFile = signal<File | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<ResumeAnalysis | null>(null);

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
      next: (analysis: ResumeAnalysis) => this.result.set(analysis),
      error: (err: unknown) => this.error.set(this.auth.messageFor(err))
    });
  }
}
