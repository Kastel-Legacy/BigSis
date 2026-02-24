'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0B1221] flex items-center justify-center text-white">
            <div className="text-center space-y-6 px-6">
                <div className="text-6xl font-black text-red-400/30">Oops</div>
                <h2 className="text-2xl font-bold">Une erreur est survenue</h2>
                <p className="text-blue-100/50 max-w-md mx-auto">
                    Nous nous excusons pour ce desagrement. Veuillez reessayer.
                </p>
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={reset}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors"
                    >
                        <RefreshCw size={16} /> Reessayer
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all"
                    >
                        Accueil <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
