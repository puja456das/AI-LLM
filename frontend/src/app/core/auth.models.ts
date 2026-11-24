export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
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

export interface RoleRecommendation {
  soc_code: string;
  title: string;
  family: string;
  similarity_score: number;
  matching_skills: string[];
  missing_skills: string[];
}

export interface ResumeAnalysis {
  detected_family: FamilyPrediction;
  alternative_families: FamilyPrediction[];
  recognized_software_skills: string[];
  recommendations: RoleRecommendation[];
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
