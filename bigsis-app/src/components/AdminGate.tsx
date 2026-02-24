'use client';

import React from 'react';
import { ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function AdminGate({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827]">
                <div className="text-white/50">Chargement...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827]">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-sm text-center space-y-6">
                    <div className="w-16 h-16 mx-auto bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
                        <ShieldOff className="text-cyan-400" size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Connexion requise</h2>
                    <p className="text-blue-200/50 text-sm">Connectez-vous avec un compte administrateur pour acceder a cette section.</p>
                    <Link
                        href="/auth/login?redirect=/admin"
                        className="inline-block w-full py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium"
                    >
                        Se connecter
                    </Link>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827]">
                <div className="glass-panel p-8 rounded-2xl w-full max-w-sm text-center space-y-6">
                    <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <ShieldOff className="text-red-400" size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Acces reserve</h2>
                    <p className="text-blue-200/50 text-sm">
                        Votre compte n&apos;a pas les droits administrateur necessaires pour acceder a cette section.
                    </p>
                    <Link
                        href="/"
                        className="inline-block w-full py-3 bg-white/5 text-white/70 border border-white/10 rounded-lg hover:bg-white/10 transition-colors font-medium"
                    >
                        Retour a l&apos;accueil
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
