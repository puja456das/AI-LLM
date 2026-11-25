from typing import Optional
from pydantic import BaseModel

# Chat request & response
class ChatRequest(BaseModel):
    message: str
    role_context: Optional[str] = None
    interviewer_type: Optional[str] = None
    interview_mode: Optional[str] = None
    skills_context: Optional[list[str]] = None

class ChatResponse(BaseModel):
    reply: str
    interviewer_persona: Optional[str] = None
    score: Optional[float] = None
    suggestions: Optional[list[str]] = None

class InterviewQuestion(BaseModel):
    category: str
    question: str
    context: Optional[str] = None
    sample_answer_tip: Optional[str] = None

class InterviewQuestionsRequest(BaseModel):
    role_title: str
    soc_code: Optional[str] = None
    skills: Optional[list[str]] = None

class InterviewQuestionsResponse(BaseModel):
    role_title: str
    soc_code: Optional[str] = None
    questions: list[InterviewQuestion]

# ATS Resume Check Models
class AtsCheckItem(BaseModel):
    label: str
    passed: bool
    detail: str

class AtsScorecard(BaseModel):
    score: int
    rating: str
    word_count: int
    quantifiable_metrics_count: int
    action_verbs_count: int
    checks: list[AtsCheckItem]
    improvement_tips: list[str]

# Salary & Market Outlook Model
class SalaryBenchmark(BaseModel):
    entry_level: str
    median: str
    senior: str
    growth_outlook: str

# Models for resume analysis
class FamilyPrediction(BaseModel):
    code: str
    name: str
    confidence: float

class RoleRecommendation(BaseModel):
    soc_code: str
    title: str
    family: str
    similarity_score: float
    matching_skills: list[str]
    missing_skills: list[str]
    salary: Optional[SalaryBenchmark] = None

class ModelInfo(BaseModel):
    name: str
    dataset: str
    training_examples: int
    test_examples: int
    occupation_profiles: int
    precision_macro: float
    recall_macro: float
    f1_macro: float

class ResumeAnalysisResponse(BaseModel):
    detected_family: FamilyPrediction
    alternative_families: list[FamilyPrediction]
    recognized_software_skills: list[str]
    recommendations: list[RoleRecommendation]
    ats_scorecard: Optional[AtsScorecard] = None
    model_info: ModelInfo
    notice: str
