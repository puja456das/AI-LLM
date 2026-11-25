import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AiService, InterviewQuestionItem } from '../../core/ai.service';
import { AnalysisService } from '../../core/analysis.service';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  suggestions?: string[];
}

const CHAT_STORAGE_KEY = 'careerpilot_interview_chatbot_history';

@Component({
  selector: 'app-interview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="interview-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <span class="eyebrow">CONVERSATIONAL COACH · SMART AI CHATBOT</span>
          <h1>AI Interview Practice Chatbot</h1>
          <p class="subtitle">
            Practice interview questions, get friendly guidance on your answers, and learn how to present yourself confidently.
          </p>
        </div>
        <div class="header-status">
          <span class="status-indicator">
            <span class="pulse-dot"></span> AI Coach Ready
          </span>
          <button class="reset-chat-btn" (click)="resetChat()">
            <span>↻</span> Clear Chat
          </button>
        </div>
      </div>

      <!-- Target Role Selector -->
      <div class="role-bar">
        <div class="role-selector-left">
          <span class="role-label">I'M PRACTICING FOR:</span>
          <div class="role-input-wrap">
            <input
              type="text"
              [(ngModel)]="targetRole"
              (keyup.enter)="updateRole()"
              placeholder="e.g. Software Developer, Python Engineer, Data Analyst..."
              class="role-input"
            />
            <button class="apply-role-btn" (click)="updateRole()">Update</button>
          </div>
        </div>

        @if (matchedRoles().length > 0) {
          <div class="quick-roles-wrap">
            <span class="quick-roles-label">Roles from your resume:</span>
            <div class="quick-roles-list">
              @for (r of matchedRoles().slice(0, 3); track r.soc_code) {
                <button
                  class="role-chip"
                  [class.active]="targetRole === r.title"
                  (click)="chooseRole(r.title)"
                >
                  {{ r.title }}
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Main Layout: Chatbot & Question Side Panel -->
      <div class="chat-layout">
        <!-- Chatbot Window -->
        <div class="chatbot-card">
          <!-- Chat Messages Area -->
          <div class="messages-container" #scrollArea>
            @for (msg of messages(); track $index) {
              <div class="message-wrapper" [class.user]="msg.sender === 'user'" [class.ai]="msg.sender === 'ai'">
                <div class="message-avatar">
                  {{ msg.sender === 'user' ? '👤' : '🤖' }}
                </div>
                <div class="message-content">
                  <div class="message-meta">
                    <span class="sender-title">{{ msg.sender === 'user' ? 'You' : 'AI Interview Coach' }}</span>
                    <span class="message-time">{{ msg.time }}</span>
                  </div>
                  <div class="message-bubble">{{ msg.text }}</div>

                  <!-- Quick clickable suggestions below AI responses -->
                  @if (msg.suggestions && msg.suggestions.length > 0 && msg.sender === 'ai') {
                    <div class="suggestions-container">
                      <span class="suggestions-title">💡 Quick ideas to reply:</span>
                      <div class="suggestions-chips">
                        @for (s of msg.suggestions; track s) {
                          <button class="suggestion-btn" (click)="sendPresetMessage(s)">
                            {{ s }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            @if (loading()) {
              <div class="message-wrapper ai">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                  <div class="typing-indicator">
                    <span></span><span></span><span></span>
                    <small>AI is thinking...</small>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Quick Action Prompts Bar -->
          <div class="prompt-starters">
            <button class="prompt-chip" (click)="sendPresetMessage('Ask me an interview question for ' + targetRole)">
              🎯 Ask Me a Question
            </button>
            <button class="prompt-chip" (click)="sendPresetMessage('Ask me a common HR or behavioral interview question')">
              🤝 HR Question
            </button>
            <button class="prompt-chip" (click)="sendPresetMessage('How should I introduce myself for a ' + targetRole + ' interview?')">
              ✨ Self-Introduction Tips
            </button>
            <button class="prompt-chip" (click)="prepareAnswerPrompt()">
              📝 Review My Answer
            </button>
          </div>

          <!-- Chat Input Area -->
          <form (ngSubmit)="sendMessage()" class="input-form">
            <textarea
              [(ngModel)]="userInput"
              name="userInput"
              rows="2"
              placeholder="Type your message or answer here... (Press Enter to send)"
              (keydown.enter)="onEnter($event)"
              required
            ></textarea>
            <button type="submit" class="send-button" [disabled]="loading() || !userInput.trim()">
              <span>Send</span> <span>➤</span>
            </button>
          </form>
        </div>

        <!-- Right Side: Common Interview Questions Bank -->
        <div class="sidebar-card">
          <div class="sidebar-header">
            <h3>Common Questions for {{ targetRole }}</h3>
            <p>Click any question to ask the AI Chatbot how to answer it or practice it.</p>
          </div>

          <div class="questions-list">
            @for (item of sampleQuestions(); track item.question) {
              <div class="question-item">
                <span class="question-tag">{{ item.category }}</span>
                <p class="question-text">{{ item.question }}</p>
                @if (item.sample_answer_tip) {
                  <small class="question-tip">💡 Tip: {{ item.sample_answer_tip }}</small>
                }
                <button class="practice-this-btn" (click)="practiceSpecificQuestion(item.question)">
                  Practice this question →
                </button>
              </div>
            }
            @if (sampleQuestions().length === 0) {
              <div class="loading-questions">
                <p>Loading curated practice questions for {{ targetRole }}...</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .interview-page {
      max-width: 1200px;
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
      max-width: 680px;
    }
    .header-status {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
    }
    .reset-chat-btn {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .reset-chat-btn:hover { background: #f8fafc; }
    .role-bar {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .role-selector-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 280px;
    }
    .role-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: #64748b;
      white-space: nowrap;
    }
    .role-input-wrap {
      display: flex;
      gap: 6px;
      flex: 1;
    }
    .role-input {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #1e293b;
      width: 100%;
      outline: none;
    }
    .role-input:focus { border-color: #3b82f6; }
    .apply-role-btn {
      background: #183c61;
      color: #fff;
      border: 0;
      border-radius: 5px;
      padding: 0 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .quick-roles-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .quick-roles-label {
      font-size: 10px;
      color: #64748b;
    }
    .quick-roles-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .role-chip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .role-chip:hover { background: #e2e8f0; }
    .role-chip.active {
      background: #183c61;
      color: #fff;
      border-color: #183c61;
    }
    .chat-layout {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 20px;
    }
    .chatbot-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      height: 680px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(16, 35, 63, 0.03);
    }
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .message-wrapper {
      display: flex;
      gap: 12px;
      max-width: 88%;
    }
    .message-wrapper.user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .message-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 16px;
      background: #f1f5f9;
      flex-shrink: 0;
    }
    .message-wrapper.user .message-avatar {
      background: #183c61;
    }
    .message-content {
      display: flex;
      flex-direction: column;
    }
    .message-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 4px;
    }
    .sender-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
    .message-wrapper.user .sender-title {
      color: #183c61;
    }
    .message-time {
      font-size: 9px;
      color: #94a3b8;
    }
    .message-bubble {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      line-height: 1.7;
      color: #1e293b;
      white-space: pre-wrap;
    }
    .message-wrapper.user .message-bubble {
      background: #183c61;
      border-color: #183c61;
      color: #fff;
    }
    .suggestions-container {
      margin-top: 10px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 10px;
    }
    .suggestions-title {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      display: block;
      margin-bottom: 6px;
    }
    .suggestions-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .suggestion-btn {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 600;
      color: #1e3a5f;
      cursor: pointer;
      text-align: left;
    }
    .suggestion-btn:hover {
      background: #eef4fb;
      border-color: #93c5fd;
    }
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      color: #64748b;
    }
    .typing-indicator span {
      width: 6px;
      height: 6px;
      background: #3b82f6;
      border-radius: 50%;
      animation: pulse 1.2s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .prompt-starters {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      overflow-x: auto;
      white-space: nowrap;
    }
    .prompt-chip {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      flex-shrink: 0;
    }
    .prompt-chip:hover {
      background: #eef4fb;
      border-color: #93c5fd;
    }
    .input-form {
      padding: 12px 16px;
      display: flex;
      gap: 10px;
      align-items: flex-end;
      background: #fff;
    }
    .input-form textarea {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
      outline: none;
      resize: none;
      font-family: inherit;
    }
    .input-form textarea:focus {
      border-color: #3b82f6;
    }
    .send-button {
      background: #183c61;
      color: #fff;
      border: 0;
      border-radius: 6px;
      padding: 10px 18px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      height: 42px;
    }
    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .sidebar-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      height: 680px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(16, 35, 63, 0.03);
    }
    .sidebar-header {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .sidebar-header h3 {
      font: 700 15px 'Manrope', sans-serif;
      color: #172b45;
      margin: 0 0 4px;
    }
    .sidebar-header p {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    .questions-list {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .question-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
    }
    .question-tag {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      color: #2563eb;
      background: #eff6ff;
      padding: 2px 6px;
      border-radius: 3px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .question-text {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.5;
      margin: 0 0 6px;
    }
    .question-tip {
      display: block;
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
      background: #fff;
      border-radius: 4px;
      padding: 6px;
      margin-bottom: 8px;
    }
    .practice-this-btn {
      background: transparent;
      border: 0;
      color: #2563eb;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }
    .practice-this-btn:hover { text-decoration: underline; }
    .loading-questions {
      text-align: center;
      padding: 30px 10px;
      color: #94a3b8;
      font-size: 11px;
    }
    @media (max-width: 900px) {
      .chat-layout {
        grid-template-columns: 1fr;
      }
      .sidebar-card {
        height: auto;
        max-height: 380px;
      }
    }
  `]
})
export class InterviewComponent implements OnInit {
  private readonly ai = inject(AiService);
  private readonly analysisService = inject(AnalysisService);
  private readonly route = inject(ActivatedRoute);

  readonly analysis = this.analysisService.result;
  readonly matchedRoles = computed(() => this.analysis()?.recommendations ?? []);

  targetRole = 'Software Developer';
  userInput = '';
  loading = signal<boolean>(false);
  sampleQuestions = signal<InterviewQuestionItem[]>([]);

  readonly messages = signal<ChatMessage[]>([]);

  ngOnInit(): void {
    const topRole = this.matchedRoles()[0];
    if (topRole) {
      this.targetRole = topRole.title;
    }

    this.route.queryParams.subscribe((params) => {
      if (params['role']) {
        this.targetRole = params['role'];
      }
    });

    this.loadHistory();
    this.loadQuestions();
  }

  chooseRole(roleTitle: string): void {
    this.targetRole = roleTitle;
    this.loadQuestions();
    this.sendPresetMessage(`I'm now practicing for the role of ${roleTitle}. What are the most important things to know?`);
  }

  updateRole(): void {
    const clean = this.targetRole.trim();
    if (!clean) return;
    this.loadQuestions();
    this.sendPresetMessage(`I updated my target role to ${clean}. Please give me a quick welcome and ask me a good practice question.`);
  }

  loadQuestions(): void {
    const skills = this.analysis()?.recognized_software_skills;
    this.ai.getInterviewQuestions(this.targetRole, undefined, skills).subscribe({
      next: (res) => this.sampleQuestions.set(res.questions),
      error: () => {
        // Graceful retry after 2.5s in case backend was still warming up during cold start
        setTimeout(() => {
          this.ai.getInterviewQuestions(this.targetRole, undefined, skills).subscribe({
            next: (res) => this.sampleQuestions.set(res.questions),
            error: () => {}
          });
        }, 2500);
      }
    });
  }

  practiceSpecificQuestion(question: string): void {
    this.userInput = `Here is my answer to the question: "${question}"\n\n`;
  }

  prepareAnswerPrompt(): void {
    this.userInput = `Here is my answer to an interview question: \n`;
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.loading()) return;
    this.userInput = '';
    this.executeChat(text);
  }

  sendPresetMessage(promptText: string): void {
    if (this.loading()) return;
    this.executeChat(promptText);
  }

  onEnter(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private executeChat(text: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text, time };

    const currentList = [...this.messages(), userMsg];
    this.messages.set(currentList);
    this.loading.set(true);

    const skills = this.analysis()?.recognized_software_skills;

    this.ai.chat(text, this.targetRole, skills).subscribe({
      next: (resp) => {
        const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const aiMsg: ChatMessage = {
          sender: 'ai',
          text: resp.reply,
          time: aiTime,
          suggestions: resp.suggestions
        };
        const updated = [...this.messages(), aiMsg];
        this.messages.set(updated);
        this.saveHistory(updated);
        this.loading.set(false);
      },
      error: () => {
        const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const errorMsg: ChatMessage = {
          sender: 'ai',
          text: "I'm having trouble connecting right now. Please make sure the backend server is running.",
          time: aiTime
        };
        const updated = [...this.messages(), errorMsg];
        this.messages.set(updated);
        this.loading.set(false);
      }
    });
  }

  resetChat(): void {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
    this.messages.set([
      {
        sender: 'ai',
        text: `Hello! 👋 I'm your CareerPilot AI Interview Coach. I'm ready to help you practice interview questions for **${this.targetRole}**.\n\nClick a quick option below or type your answer to get friendly, instant feedback!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          `Ask me an interview question for ${this.targetRole}`,
          'How should I introduce myself?',
          'Ask me a common HR / behavioral question'
        ]
      }
    ]);
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages.set(parsed);
          return;
        }
      }
    } catch {}

    this.resetChat();
  }

  private saveHistory(list: ChatMessage[]): void {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(list.slice(-30)));
    } catch {}
  }
}
