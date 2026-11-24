import { Injectable, signal } from '@angular/core';
import { ResumeAnalysis } from './auth.models';

/**
 * Shared service to hold the latest resume analysis result.
 * Other components (Jobs, Skills) can read from this service
 * without needing to pass data via routes.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  // Holds the whole analysis object or null if none yet.
  readonly result = signal<ResumeAnalysis | null>(null);
}
