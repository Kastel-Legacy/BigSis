import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface AnalyzeRequest {
  session_id: string; // Fixed 'str' typo
  area: string;
  wrinkle_type: string;
  age_range?: string;
  pregnancy?: boolean;
  language?: string;
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

// --- Added for FichePage and StudyCard ---

export interface ClinicalStudy {
  titre: string;
  annee: string;
  pmid: string;
  resume: string;
  lien: string;
}

export interface FicheData {
  nom_commercial_courant?: string;
  titre_officiel?: string;
  nom_scientifique?: string;
  carte_identite?: {
    ce_que_c_est?: string;
    comment_ca_marche?: string;
  };
  synthese_efficacite?: {
    ce_que_ca_fait_vraiment?: string;
    delai_resultat?: string;
    duree_resultat?: string;
  };
  meta?: {
    zones_concernees?: string[];
  };
  statistiques_consolidees?: {
    nombre_patients_total?: string;
    niveau_de_preuve_global?: string;
  };
  annexe_sources_retenues?: Array<{
    annee?: string;
    titre?: string;
    url?: string;
  }>;
  alternative_bigsis?: {
    titre?: string;
    pourquoi_c_est_mieux?: string;
  };
  score_global?: {
    note_efficacite_sur_10?: number | string;
    note_securite_sur_10?: number | string;
    explication_efficacite_bref?: string;
    explication_securite_bref?: string;
  };
  le_conseil_bigsis?: string;
}


export const getFiche = async (pmid: string): Promise<FicheData> => {
  const response = await axios.get(`${API_URL}/fiches/${pmid}`);
  return response.data;
};

export const getDocument = async (id: string): Promise<any> => {
  const response = await fetch(`${API_URL}/knowledge/documents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }
  return response.json();
};
