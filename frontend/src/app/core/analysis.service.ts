import { Injectable, signal } from '@angular/core';
import { ResumeAnalysis } from './auth.models';

const STORAGE_KEY = 'careerpilot_resume_analysis';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly _result = signal<ResumeAnalysis | null>(this.readStorage());

  readonly result = this._result.asReadonly();

  setResult(analysis: ResumeAnalysis | null): void {
    this._result.set(analysis);
    if (analysis) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(analysis));
      } catch (e) {
        console.error('Failed to save analysis to localStorage', e);
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }
  }

  clear(): void {
    this.setResult(null);
  }

  private readStorage(): ResumeAnalysis | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}
