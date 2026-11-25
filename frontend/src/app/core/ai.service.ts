import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResumeAnalysis } from './auth.models';

export interface ChatResponse {
  reply: string;
  interviewer_persona?: string;
  score?: number;
  suggestions?: string[];
}

export interface InterviewQuestionItem {
  category: string;
  question: string;
  context?: string;
  sample_answer_tip?: string;
}

export interface InterviewQuestionsResponse {
  role_title: string;
  soc_code?: string;
  questions: InterviewQuestionItem[];
}

export interface PopularRoleItem {
  soc_code: string;
  title: string;
  family_code: string;
  skills: string[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private readonly http: HttpClient) {}

  analyzeResume(file: File): Observable<ResumeAnalysis> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<ResumeAnalysis>('/api/v1/ai/analyze-resume', body);
  }

  chat(
    message: string,
    roleContext?: string,
    skillsContext?: string[],
    interviewerType?: string,
    interviewMode?: string
  ): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/v1/ai/chat', {
      message,
      role_context: roleContext,
      skills_context: skillsContext,
      interviewer_type: interviewerType,
      interview_mode: interviewMode,
    });
  }

  getInterviewQuestions(roleTitle: string, socCode?: string, skills?: string[]): Observable<InterviewQuestionsResponse> {
    return this.http.post<InterviewQuestionsResponse>('/api/v1/ai/interview-questions', {
      role_title: roleTitle,
      soc_code: socCode,
      skills,
    });
  }

  getPopularRoles(): Observable<{ roles: PopularRoleItem[] }> {
    return this.http.get<{ roles: PopularRoleItem[] }>('/api/v1/ai/popular-roles');
  }
}
