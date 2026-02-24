import type { Metadata } from 'next';
import { fetchFiches } from '@/lib/api-server';
import type { FicheListItem } from '@/api';
import FichesListContent from '@/views/FichesListPage';

export const metadata: Metadata = {
  title: 'Fiches Verite - Procedures esthetiques analysees',
  description: 'Chaque procedure esthetique analysee avec un score d\'efficacite et de securite. Sans marketing, sans filtre.',
};

export const revalidate = 60;

export default async function FichesPage() {
  let fiches: FicheListItem[] = [];
  try {
    fiches = await fetchFiches();
  } catch (err) {
    console.error('Failed to fetch fiches:', err);
  }
  return <FichesListContent fiches={fiches} />;
}
