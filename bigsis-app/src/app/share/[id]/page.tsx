import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchShare } from '@/lib/api-server';
import ShareContent from '@/views/SharePage';

interface PageProps {
    params: Promise<{ id: string }>;
}

const zoneLabels: Record<string, string> = {
    front: 'Front',
    glabelle: 'Glabelle',
    pattes_oie: 'Pattes d\'oie',
    sillon_nasogenien: 'Sillon Nasogenien',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    try {
        const data = await fetchShare(id);
        const zone = zoneLabels[data.area] || data.area;
        const title = `Diagnostic ${zone} - BigSIS`;
        const description = data.top_recommendation
            ? `Zone: ${zone}. Recommandation: ${data.top_recommendation}`
            : `Resultat de diagnostic esthetique IA pour la zone ${zone}.`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: 'article',
                siteName: 'BigSIS',
                locale: 'fr_FR',
            },
            twitter: {
                card: 'summary',
                title,
                description,
            },
            robots: { index: false },
        };
    } catch {
        return { title: 'Diagnostic partage | BigSIS' };
    }
}

export const dynamic = 'force-dynamic';

export default async function SharePageRoute({ params }: PageProps) {
    const { id } = await params;

    let data;
    try {
        data = await fetchShare(id);
    } catch {
        notFound();
    }

    return <ShareContent data={data} id={id} />;
}
