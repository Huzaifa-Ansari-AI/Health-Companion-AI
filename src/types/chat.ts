// Milestone 1: Interactive AI Symptom Consultation Chatbot Types
// Defines strongly-typed entities for sessions, messages, and assessment extractions.

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type ChatRole = 'user' | 'assistant';

export type ChatSessionStatus = 'active' | 'archived';

export interface ChatExtractedData {
  symptoms?: string[];
  duration?: string;
  intensity?: string;
  lifestyle?: string;
}

export interface ChatMessageMetadata {
  emergency?: boolean;
  risk_level?: RiskLevel | null;
  suggested_replies?: string[];
  extracted?: ChatExtractedData;
  personalized?: boolean;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  status: ChatSessionStatus;
  risk_level: RiskLevel | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  metadata?: ChatMessageMetadata;
  created_at: string;
}

export interface ChatConsultResponse {
  reply: string;
  risk_level: RiskLevel | null;
  emergency: boolean;
  suggested_replies: string[];
  extracted: ChatExtractedData;
  personalized?: boolean;
}

export interface HealthAssessmentSummary {
  symptoms: string[];
  duration?: string;
  intensity?: string;
  lifestyle_factors?: string[];
  risk_level: RiskLevel;
  summary: string;
  recommendations: string[];
  doctor_questions: string[];
  disclaimer: string;
}
