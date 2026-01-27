import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { ScanLine, FlaskConical, LayoutDashboard } from 'lucide-react';

const PublicLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[#0B1221] text-white">
            {/* Simple Public Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10 bg-black/20 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-xl opacity-80 blur group-hover:blur-md transition-all duration-300"></div>
                            <div className="absolute inset-0.5 bg-black/40 rounded-[10px] flex items-center justify-center border border-white/10">
                                <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-cyan-400 to-purple-400 text-sm">BS</span>
                            </div>
                        </div>
                        <h1 className="text-lg font-bold tracking-wider text-white">BIG SIS</h1>
                    </div>

                    <nav className="flex items-center gap-2">
                        <NavLink to="/" icon={<LayoutDashboard size={16} />} label="Diagnostic" active={location.pathname === '/'} />
                        <NavLink to="/scanner" icon={<ScanLine size={16} />} label="Scanner" active={location.pathname === '/scanner'} />
                        <NavLink to="/ingredients" icon={<FlaskConical size={16} />} label="Ingredients" active={location.pathname === '/ingredients'} />
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 pb-12 px-6">
                <Outlet />
            </main>
        </div>
    );
};

function NavLink({ to, icon, label, active }: { to: string, icon: React.ReactNode, label: string, active: boolean }) {
    return (
        <Link
            to={to}
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

export default PublicLayout;
