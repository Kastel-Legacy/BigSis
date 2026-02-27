import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
  titre_social?: string;
  carte_identite?: {
    ce_que_c_est?: string;
    comment_ca_marche?: string;
    zone_anatomique?: string;
  };
  synthese_efficacite?: {
    ce_que_ca_fait_vraiment?: string;
    delai_resultat?: string;
    duree_resultat?: string;
  };
  synthese_securite?: {
    le_risque_qui_fait_peur?: string;
    risques_courants?: string[];
    contre_indications?: string[];
    frequence_effets_secondaires?: string;
  };
  recuperation_sociale?: {
    verdict_immediat?: string;
    downtime_visage_nu?: string;
    zoom_ready?: string;
    date_ready?: string;
    les_interdits_sociaux?: string[];
  };
  meta?: {
    zones_concernees?: string[];
    categories?: string[];
  };
  statistiques_consolidees?: {
    nombre_patients_total?: string;
    niveau_de_preuve_global?: string;
    nombre_etudes_pertinentes_retenues?: string;
  };
  annexe_sources_retenues?: Array<{
    id?: number;
    annee?: string;
    titre?: string;
    url?: string;
    pmid?: string;
    raison_inclusion?: string;
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
    verdict_final?: string;
  };
  le_conseil_bigsis?: string;
  mode_application?: string;
  evidence_metadata?: {
    fda_adverse_count?: number;
    active_trials_count?: number;
    pubmed_studies_count?: number;
    scholar_citations_total?: number;
    trs_score?: number;
    data_sources_used?: string[];
  };
  safety_warnings?: Array<{
    type: string;
    key: string;
    detail: string;
    weight: number;
  }>;
}


export const getFiche = async (pmid: string): Promise<FicheData> => {
  const response = await axios.get(`${API_URL}/fiches/${pmid}`);
  return response.data.data;
};

export interface FicheListItem {
    topic: string;
    slug: string;
    title: string;
    scientific_name: string;
    score_efficacite: number | null;
    score_securite: number | null;
    trs_score: number | null;
    status?: string;
    zones: string[];
    created_at: string;
}

export const listFiches = async (): Promise<FicheListItem[]> => {
    const response = await axios.get(`${API_URL}/fiches`);
    return response.data;
};

export const listFichesAdmin = async (token: string): Promise<FicheListItem[]> => {
    const response = await axios.get(`${API_URL}/fiches?include_drafts=true`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const publishFiche = async (slug: string, token: string): Promise<any> => {
    const response = await axios.patch(
        `${API_URL}/fiches/${encodeURIComponent(slug)}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const unpublishFiche = async (slug: string, token: string): Promise<any> => {
    const response = await axios.patch(
        `${API_URL}/fiches/${encodeURIComponent(slug)}/unpublish`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const deleteFiche = async (slug: string, token: string): Promise<any> => {
    const response = await axios.delete(
        `${API_URL}/fiches/${encodeURIComponent(slug)}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const regenerateFiche = async (topic: string, token: string): Promise<any> => {
    const response = await axios.post(
        `${API_URL}/social/generate`,
        { topic, force: true },
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const listFicheVersions = async (slug: string, token: string): Promise<any[]> => {
    const response = await axios.get(
        `${API_URL}/fiches/${encodeURIComponent(slug)}/versions`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const submitFicheFeedback = async (slug: string, rating: number, comment?: string): Promise<any> => {
    const response = await axios.post(
        `${API_URL}/fiches/${encodeURIComponent(slug)}/feedback`,
        { rating, comment },
    );
    return response.data;
};

export const getFicheFeedback = async (slug: string): Promise<{ thumbs_up: number; thumbs_down: number; total: number }> => {
    const response = await axios.get(`${API_URL}/fiches/${encodeURIComponent(slug)}/feedback`);
    return response.data;
};

export interface ReadyTopic {
    id: string;
    titre: string;
    slug: string;
    trs_current: number;
    learning_iterations: number;
    status: string;
}

export const listReadyTopics = async (token: string): Promise<ReadyTopic[]> => {
    const response = await axios.get(`${API_URL}/fiches/ready-topics`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const generateFiche = async (titre: string, token: string): Promise<{ status: string; slug: string }> => {
    const response = await axios.post(
        `${API_URL}/fiches/generate`,
        { titre },
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const getDocument = async (id: string): Promise<any> => {
  const response = await fetch(`${API_URL}/knowledge/documents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }
  return response.json();
};

// --- Share (Viral Loop) ---

export interface ShareData {
  id: string;
  area: string;
  wrinkle_type: string;
  uncertainty_level: string;
  score: number;
  top_recommendation: string;
  questions_count: number;
  created_at: string | null;
}

export const createShare = async (data: {
  area: string;
  wrinkle_type: string;
  uncertainty_level: string;
  top_recommendation: string;
  questions_count: number;
}): Promise<{ share_id: string; share_url: string }> => {
  const response = await axios.post(`${API_URL}/share`, data);
  return response.data;
};

export const getShare = async (id: string): Promise<ShareData> => {
  const response = await axios.get(`${API_URL}/share/${id}`);
  return response.data;
};


// --- Social Posts (Instagram) ---

export interface SlideData {
    slide_number: number;
    type: string;          // hook | content | comparison | cta
    headline: string;
    body: string;
    accent_text?: string;
    emoji?: string;        // check | cross | warning | fire | star | vs
    bullet_points?: string[];
    comparison?: { left: string; right: string };
    background_style: string;
}

export interface SocialPostItem {
    id: string;
    fiche_id: string;
    fiche_title: string;
    template_type: string;
    template_label: string;
    title: string;
    slides_count: number;
    status: string;
    created_at: string;
}

export interface SocialPostDetail {
    id: string;
    fiche_id: string;
    template_type: string;
    template_label: string;
    title: string;
    slides: SlideData[];
    caption: string;
    hashtags: string[];
    status: string;
    created_at: string;
}

export interface TemplateOption {
    id: string;
    label: string;
}

export const listSocialPosts = async (
    token: string,
    status?: string,
    templateType?: string,
): Promise<SocialPostItem[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (templateType) params.set('template_type', templateType);
    const response = await axios.get(`${API_URL}/social-posts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const getSocialPost = async (id: string, token: string): Promise<SocialPostDetail> => {
    const response = await axios.get(`${API_URL}/social-posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export const generateSocialPost = async (
    ficheId: string,
    templateType: string,
    token: string,
): Promise<SocialPostDetail> => {
    const response = await axios.post(
        `${API_URL}/social-posts/generate`,
        { fiche_id: ficheId, template_type: templateType },
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const updatePostStatus = async (
    id: string,
    status: string,
    token: string,
): Promise<{ id: string; status: string }> => {
    const response = await axios.patch(
        `${API_URL}/social-posts/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const updatePostSlides = async (
    id: string,
    slides: SlideData[],
    token: string,
): Promise<SocialPostDetail> => {
    const response = await axios.patch(
        `${API_URL}/social-posts/${id}/slides`,
        { slides },
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const deleteSocialPost = async (id: string, token: string): Promise<{ deleted: boolean }> => {
    const response = await axios.delete(
        `${API_URL}/social-posts/${id}`,
        { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
};

export const listSocialTemplates = async (): Promise<TemplateOption[]> => {
    const response = await axios.get(`${API_URL}/social-posts/templates`);
    return response.data;
};

export const listPublishedFiches = async (token: string): Promise<FicheListItem[]> => {
    const response = await axios.get(`${API_URL}/fiches`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export interface FicheForPost {
    id: string;
    title: string;
    topic: string;
    status: string;
    score_efficacite: number | null;
    score_securite: number | null;
}

export const listFichesForPosts = async (token: string): Promise<FicheForPost[]> => {
    const response = await axios.get(`${API_URL}/social-posts/fiches`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};
