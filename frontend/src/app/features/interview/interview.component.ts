// Interview component with plain properties (no signals)
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AiService } from '../../core/ai.service';

interface QnA {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-interview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Interview Practice</h2>
    <div class="question-list">
      <div *ngFor="let item of history" class="qa-item">
        <p class="q"><strong>Q:</strong> {{ item.question }}</p>
        <p class="a"><strong>A:</strong> {{ item.answer }}</p>
      </div>
    </div>
    <form (ngSubmit)="ask()" class="ask-form">
      <textarea [(ngModel)]="userQuestion" name="question" rows="3" placeholder="Type your interview question..." required></textarea>
      <button type="submit" [disabled]="loading">{{ loading ? 'Asking…' : 'Ask AI' }}</button>
    </form>
  `,
  styles: [`
    .qa-item { margin-bottom: 1rem; padding: .5rem; border: 1px solid #ddd; border-radius: 4px; }
    .q, .a { margin: 0; }
    .ask-form { display: flex; flex-direction: column; gap: .5rem; margin-top: 1rem; }
    textarea { width: 100%; padding: .4rem; }
    button { align-self: flex-start; }
  `]
})
export class InterviewComponent {
  private readonly ai = inject(AiService);
  history: QnA[] = [];
  userQuestion: string = '';
  loading: boolean = false;

  ask(): void {
    const q = this.userQuestion.trim();
    if (!q) return;
    this.loading = true;
    this.ai.chat(q).subscribe({
      next: (resp) => {
        const answer = resp?.reply ?? JSON.stringify(resp);
        this.history.push({ question: q, answer });
        this.userQuestion = '';
      },
      error: () => {
        this.history.push({ question: q, answer: 'Error contacting AI.' });
      },
      complete: () => (this.loading = false)
    });
  }
}
