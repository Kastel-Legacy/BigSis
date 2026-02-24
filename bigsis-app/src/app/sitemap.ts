import type { MetadataRoute } from 'next';
import { fetchFiches } from '@/lib/api-server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bigsis.fr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: SITE_URL,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${SITE_URL}/fiches`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ];

    try {
        const fiches = await fetchFiches();
        const ficheRoutes: MetadataRoute.Sitemap = fiches.map((f) => ({
            url: `${SITE_URL}/fiches/${f.slug}`,
            lastModified: f.created_at ? new Date(f.created_at) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

        return [...staticRoutes, ...ficheRoutes];
    } catch {
        return staticRoutes;
    }
}
