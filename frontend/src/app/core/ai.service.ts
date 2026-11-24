import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResumeAnalysis } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private readonly http: HttpClient) {}

  analyzeResume(file: File): Observable<ResumeAnalysis> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<ResumeAnalysis>('/api/v1/ai/analyze-resume', body);
  }

  chat(message: string): Observable<any> {
    return this.http.post<any>('/api/v1/ai/chat', { message });
  }
}
