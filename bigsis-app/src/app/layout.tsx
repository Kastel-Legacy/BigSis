import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'BigSIS - Diagnostic Esthetique IA Gratuit',
    template: '%s | BigSIS',
  },
  description: 'Evaluez vos rides avec l\'IA. Recommandations personnalisees et questions pour votre praticien. Gratuit et anonyme.',
  openGraph: {
    type: 'website',
    siteName: 'BigSIS',
    locale: 'fr_FR',
    title: 'BigSIS - Diagnostic Esthetique IA Gratuit',
    description: 'Evaluez vos rides avec l\'IA. Recommandations personnalisees et questions pour votre praticien.',
  },
  twitter: {
    card: 'summary',
    title: 'BigSIS - Diagnostic Esthetique IA Gratuit',
    description: 'Evaluez vos rides avec l\'IA. Recommandations personnalisees et questions pour votre praticien.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
