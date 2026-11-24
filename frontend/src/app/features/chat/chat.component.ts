import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AiService } from '../../core/ai.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="chat-container">
      <h2>CareerPilot ChatBot</h2>
      <div class="messages">
        <div *ngFor="let msg of messages()" [class]="'message ' + msg.role">
          <strong>{{ msg.role === 'user' ? 'You' : 'Bot' }}:</strong> {{ msg.content }}
        </div>
      </div>
      <form (ngSubmit)="send()" class="input-form">
        <input [(ngModel)]="userInput()" name="msg" placeholder="Ask a career question…" required />
        <button type="submit" [disabled]="loading()">{{ loading() ? 'Sending…' : 'Send' }}</button>
      </form>
    </div>
  `,
  styles: [`
    .chat-container { max-width: 800px; margin: 2rem auto; padding: 1rem; }
    .messages { min-height: 200px; border: 1px solid #ddd; padding: .5rem; margin-bottom: 1rem; }
    .message { margin: .3rem 0; }
    .message.user { color: #0066cc; }
    .message.assistant { color: #555; }
    .input-form { display: flex; gap: .5rem; }
    .input-form input { flex: 1; padding: .4rem; }
  `]
})
export class ChatComponent {
  private readonly ai = inject(AiService);
  readonly messages = signal<ChatMessage[]>([]);
  readonly userInput = signal('');
  readonly loading = signal(false);

  send(): void {
    const text = this.userInput().trim();
    if (!text) return;
    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.userInput.set('');
    this.loading.set(true);
    this.ai.chat(text).subscribe({
      next: (resp) => {
        const reply = resp?.reply ?? JSON.stringify(resp);
        this.messages.update((msgs) => [...msgs, { role: 'assistant', content: reply }]);
      },
      error: () => {
        this.messages.update((msgs) => [...msgs, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      },
      complete: () => this.loading.set(false)
    });
  }
}
