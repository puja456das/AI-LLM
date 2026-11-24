import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Job {
  title: string;
  company: string;
  location: string;
  match: number; // percentage match
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Job Matches</h2>
    <div class="job-list">
      <div *ngFor="let job of jobs" class="job-card">
        <h3>{{ job.title }} – {{ job.company }}</h3>
        <p>{{ job.location }}</p>
        <div class="match-bar">
          <span class="label">Match {{ job.match }}%</span>
          <div class="bar-bg"><div class="bar-fg" [style.width.%]="job.match"></div></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .job-card { border: 1px solid #ddd; padding: 1rem; margin-bottom: .5rem; border-radius: 4px; }
    .match-bar { margin-top: .5rem; }
    .bar-bg { background: #eee; height: 8px; border-radius: 4px; overflow: hidden; }
    .bar-fg { background: #4caf50; height: 100%; }
    .label { font-size: .9rem; }
  `]
})
export class JobsComponent {
  readonly jobs: Job[] = [
    { title: 'Data Engineer', company: 'TechCo', location: 'Remote', match: 87 },
    { title: 'Backend Developer', company: 'FinCorp', location: 'New York, NY', match: 73 },
    { title: 'AI Researcher', company: 'InnovateAI', location: 'San Francisco, CA', match: 65 },
  ];
}

