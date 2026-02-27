'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, User, LogOut, History, BookOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 border border-transparent
        ${active
          ? 'bg-white/10 border-white/10 text-cyan-400'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {icon}
      <span className="font-medium text-sm hidden md:inline">{label}</span>
    </Link>
  );
}

function AuthMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all border border-transparent"
      >
        <User size={16} />
        <span className="hidden md:inline">Connexion</span>
      </Link>
    );
  }

  const initials = (user.user_metadata?.first_name?.[0] || user.email?.[0] || '?').toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
      >
        <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
          {initials}
        </div>
        <ChevronDown size={14} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 glass-panel rounded-xl border border-white/10 overflow-hidden z-50">
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
            <User size={16} /> Mon Profil
          </Link>
          <Link href="/history" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
            <History size={16} /> Mes Diagnostics
          </Link>
          <Link href="/journal" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
            <BookOpen size={16} /> Journal Post-Acte
          </Link>
          <div className="border-t border-white/10" />
          <button
            onClick={() => { signOut(); setOpen(false); router.push('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} /> Se deconnecter
          </button>
        </div>
      )}
    </div>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0B1221] text-white">
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => router.push('/')}>
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-xl opacity-80 blur group-hover:blur-md transition-all duration-300"></div>
              <div className="absolute inset-0.5 bg-black/40 rounded-[10px] flex items-center justify-center border border-white/10">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-purple-400 text-sm">BS</span>
              </div>
            </div>
            <h1 className="text-lg font-bold tracking-wider text-white">BIG SIS</h1>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink href="/" icon={<LayoutDashboard size={16} />} label="Diagnostic" active={pathname === '/'} />
            <NavLink href="/fiches" icon={<FileText size={16} />} label="Fiches Verite" active={pathname?.startsWith('/fiches') ?? false} />
            <AuthMenu />
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6">
        {children}
      </main>
    </div>
  );
}
