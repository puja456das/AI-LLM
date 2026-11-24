import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SkillPlan {
  area: string;
  progress: number; // percent complete
}

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Skill Plan</h2>
    <div class="skill-list">
      <div *ngFor="let plan of plans" class="skill-card">
        <h3>{{ plan.area }}</h3>
        <div class="progress-bar">
          <div class="filled" [style.width.%]="plan.progress"></div>
        </div>
        <span class="pct">{{ plan.progress }}%</span>
      </div>
    </div>
  `,
  styles: [`
    .skill-card { border: 1px solid #ddd; padding: .8rem; margin-bottom: .5rem; border-radius: 4px; }
    .progress-bar { background: #eee; height: 8px; border-radius: 4px; overflow: hidden; margin: .3rem 0; }
    .filled { background: #2196f3; height: 100%; }
    .pct { font-size: .8rem; color: #555; }
  `]
})
export class SkillsComponent {
  readonly plans: SkillPlan[] = [
    { area: 'Data Engineering', progress: 45 },
    { area: 'Backend Development', progress: 30 },
    { area: 'AI & ML', progress: 20 },
  ];
}

interface SkillPlan {
  area: string;
  progress: number;
}
