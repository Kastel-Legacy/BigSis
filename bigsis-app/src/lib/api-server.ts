import type { FicheListItem, FicheData, ShareData } from '../api';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchFiches(): Promise<FicheListItem[]> {
  const res = await fetch(`${API_URL}/fiches`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('Failed to fetch fiches');
  return res.json();
}

export async function fetchFiche(slug: string): Promise<{ data: FicheData }> {
  const res = await fetch(`${API_URL}/fiches/${encodeURIComponent(slug)}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('Failed to fetch fiche');
  return res.json();
}

export async function fetchShare(id: string): Promise<ShareData> {
  const res = await fetch(`${API_URL}/share/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch share');
  return res.json();
}
