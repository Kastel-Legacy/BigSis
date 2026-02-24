import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0B1221] flex items-center justify-center text-white">
            <div className="text-center space-y-6 px-6">
                <div className="text-8xl font-black text-white/10">404</div>
                <h2 className="text-2xl font-bold">Page introuvable</h2>
                <p className="text-blue-100/50 max-w-md mx-auto">
                    Cette page n&apos;existe pas ou a ete deplacee.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all"
                >
                    Faire mon diagnostic <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
}
