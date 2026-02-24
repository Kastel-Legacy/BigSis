'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] to-[#111827]" />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/profile';

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) { setError('Auth non configuree'); setLoading(false); return; }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827] px-4">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
            <Mail className="text-green-400" size={28} />
          </div>
          <h2 className="text-xl font-bold text-white">Verifiez votre email</h2>
          <p className="text-blue-200/50 text-sm">
            Un lien de confirmation a ete envoye a <span className="text-cyan-400">{email}</span>.
            Cliquez dessus pour activer votre compte.
          </p>
          <Link
            href="/auth/login"
            className="inline-block mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
          >
            Retour a la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827] px-4">
      <div className="w-full max-w-sm space-y-6">
        <form onSubmit={handleSignup} className="glass-panel p-8 rounded-2xl space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
              <UserPlus className="text-cyan-400" size={28} />
            </div>
            <h2 className="text-xl font-bold text-white">Creer un compte</h2>
            <p className="text-blue-200/50 text-sm mt-1">Sauvegardez vos diagnostics et suivez vos actes</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prenom"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="Email"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Mot de passe (6 caracteres min.)"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none"
                required
                minLength={6}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Creation...' : 'Creer mon compte'}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm">
          Deja un compte ?{' '}
          <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
