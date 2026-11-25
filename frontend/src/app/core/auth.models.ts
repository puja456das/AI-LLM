export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  is_admin?: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface FamilyPrediction {
  code: string;
  name: string;
  confidence: number;
}

export interface SalaryBenchmark {
  entry_level: string;
  median: string;
  senior: string;
  growth_outlook: string;
}

export interface RoleRecommendation {
  soc_code: string;
  title: string;
  family: string;
  similarity_score: number;
  matching_skills: string[];
  missing_skills: string[];
  salary?: SalaryBenchmark;
}

export interface AtsCheckItem {
  label: string;
  passed: boolean;
  detail: string;
}

export interface AtsScorecard {
  score: number;
  rating: string;
  word_count: number;
  quantifiable_metrics_count: number;
  action_verbs_count: number;
  checks: AtsCheckItem[];
  improvement_tips: string[];
}

export interface ResumeAnalysis {
  detected_family: FamilyPrediction;
  alternative_families: FamilyPrediction[];
  recognized_software_skills: string[];
  recommendations: RoleRecommendation[];
  ats_scorecard?: AtsScorecard;
  model_info: {
    name: string;
    dataset: string;
    training_examples: number;
    test_examples: number;
    occupation_profiles: number;
    precision_macro: number;
    recall_macro: number;
    f1_macro: number;
  };
  notice: string;
}

export type ApplicationStage = 'target' | 'applied' | 'interviewing' | 'offer' | 'archived';

export interface JobApplication {
  id: string;
  soc_code: string;
  title: string;
  company: string;
  stage: ApplicationStage;
  similarity_score?: number;
  salary?: string;
  notes?: string;
  date_added: string;
}

export interface CorporateJob {
  id: number;
  title: string;
  company: string;
  location: string;
  salary_range: string;
  required_skills: string;
  description: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_corporate_jobs: number;
  model_profiles_count: number;
  model_status: string;
  recent_users: UserProfile[];
}

export interface ToggleAdminResult {
  user_id: number;
  email: string;
  is_admin: boolean;
  message: string;
}
