import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface AnalyzeRequest {
  session_id: string; // Fixed 'str' typo
  area: string;
  wrinkle_type: string;
  age_range?: string;
  pregnancy?: boolean;
}

export interface EvidenceItem {
  text: string;
  source: string;
  url?: string;
  chunk_id?: number;
}

export interface AnalyzeResponse {
  summary: string;
  explanation: string;
  options_discussed: string[];
  risks_and_limits: string[];
  questions_for_practitioner: string[];
  uncertainty_level: string;
  evidence_used: EvidenceItem[]; // Typed correctly
}

export const analyzeWrinkles = async (data: AnalyzeRequest): Promise<AnalyzeResponse> => {
  const response = await axios.post(`${API_URL}/analyze`, data);
  return response.data;
};
