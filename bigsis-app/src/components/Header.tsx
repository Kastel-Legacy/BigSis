import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Database, FlaskConical, ScanLine, Sparkles, Search } from 'lucide-react';

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10 bg-black/20 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => navigate('/')}
                >
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-xl opacity-80 blur group-hover:blur-md transition-all duration-300"></div>
                        <div className="absolute inset-0.5 bg-black/40 rounded-[10px] flex items-center justify-center border border-white/10">
                            <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-purple-400 text-lg">BS</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-wider text-white">BIG SIS</h1>
                        <span className="text-[10px] tracking-[0.2em] text-cyan-400/80 uppercase">Cutting through the BS</span>
                    </div>
                </div>

                <nav className="flex items-center gap-2">
                    <NavLink to="/" icon={<LayoutDashboard size={18} />} label="Diagnostic" active={location.pathname === '/' || location.pathname === '/diagnostic'} />
                    <NavLink to="/scanner" icon={<ScanLine size={18} />} label="Scanner" active={location.pathname === '/scanner'} />
                    <NavLink to="/knowledge" icon={<Database size={18} />} label="Knowledge" active={location.pathname === '/knowledge'} />
                    <NavLink to="/ingredients" icon={<FlaskConical size={18} />} label="Ingredients" active={location.pathname === '/ingredients'} />
                    <NavLink to="/studio" icon={<Sparkles size={18} />} label="Studio" active={location.pathname === '/studio'} />
                    <NavLink to="/research" icon={<Search size={18} />} label="Research" active={location.pathname === '/research'} />
                </nav>
            </div>
        </header>
    );
}

function NavLink({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) {
    return (
        <Link
            to={to}
            aria-current={active ? 'page' : undefined}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 border border-transparent
                ${active
                    ? 'bg-white/10 border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5 hover:border-white/5'
                }
            `}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
        </Link>
    );
}
