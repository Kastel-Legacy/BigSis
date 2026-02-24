import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchFiches, fetchFiche } from '@/lib/api-server';
import FicheContent from '@/views/FichePage';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    try {
        const fiches = await fetchFiches();
        return fiches.map((f) => ({ slug: f.slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    try {
        const { data } = await fetchFiche(slug);
        const title = data.nom_commercial_courant || data.titre_officiel || slug;
        const description = data.carte_identite?.ce_que_c_est
            || data.synthese_efficacite?.ce_que_ca_fait_vraiment
            || `Fiche verite sur ${title} : efficacite, securite, preuves scientifiques.`;

        return {
            title: `${title} - Fiche Verite`,
            description,
            openGraph: {
                title: `${title} | BigSIS Fiche Verite`,
                description,
                type: 'article',
                siteName: 'BigSIS',
                locale: 'fr_FR',
            },
            twitter: {
                card: 'summary_large_image',
                title: `${title} | BigSIS`,
                description,
            },
        };
    } catch {
        return { title: 'Fiche Verite | BigSIS' };
    }
}

export const revalidate = 60;

export default async function FichePageRoute({ params }: PageProps) {
    const { slug } = await params;

    let ficheData;
    try {
        const result = await fetchFiche(slug);
        ficheData = result.data;
    } catch {
        notFound();
    }

    // Schema.org structured data
    const title = ficheData.nom_commercial_courant || ficheData.titre_officiel || slug;
    const description = ficheData.carte_identite?.ce_que_c_est || '';
    const scores = ficheData.score_global || {};

    const zones = ficheData.meta?.zones_concernees || [];
    const risques = ficheData.synthese_securite?.risques_courants || [];
    const recovery = ficheData.recuperation_sociale;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MedicalWebPage',
        name: title,
        description,
        about: {
            '@type': 'MedicalProcedure',
            name: title,
            description: ficheData.synthese_efficacite?.ce_que_ca_fait_vraiment || '',
            ...(zones.length > 0 && { bodyLocation: zones.join(', ') }),
            ...(risques.length > 0 && { risks: risques.join(', ') }),
        },
        mainEntity: {
            '@type': 'FAQPage',
            mainEntity: [
                ...(ficheData.carte_identite?.ce_que_c_est ? [{
                    '@type': 'Question',
                    name: `Qu'est-ce que ${title} ?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: ficheData.carte_identite.ce_que_c_est,
                    },
                }] : []),
                ...(ficheData.carte_identite?.comment_ca_marche ? [{
                    '@type': 'Question',
                    name: `Comment fonctionne ${title} ?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: ficheData.carte_identite.comment_ca_marche,
                    },
                }] : []),
                ...(ficheData.synthese_efficacite?.ce_que_ca_fait_vraiment ? [{
                    '@type': 'Question',
                    name: `${title} est-il efficace ?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `Efficacite: ${scores.note_efficacite_sur_10 ?? '?'}/10. ${ficheData.synthese_efficacite.ce_que_ca_fait_vraiment}`,
                    },
                }] : []),
                ...(ficheData.synthese_securite?.le_risque_qui_fait_peur ? [{
                    '@type': 'Question',
                    name: `Quels sont les risques de ${title} ?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `${ficheData.synthese_securite.le_risque_qui_fait_peur}${risques.length > 0 ? ` Effets courants : ${risques.join(', ')}.` : ''}`,
                    },
                }] : []),
                ...(recovery?.downtime_visage_nu ? [{
                    '@type': 'Question',
                    name: `Quel est le temps de recuperation apres ${title} ?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `Visage nu : ${recovery.downtime_visage_nu}. Zoom ready : ${recovery.zoom_ready ?? 'non precise'}. Date ready : ${recovery.date_ready ?? 'non precise'}.`,
                    },
                }] : []),
            ],
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <FicheContent data={ficheData} slug={slug} />
        </>
    );
}
