'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Database,
    Home,
    Instagram,
    Menu,
    Settings,
    Shield,
    TrendingUp,
    FileText,
    X
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[#050912] text-white">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — hidden on mobile, slide-in when open */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-[#0B1221] flex flex-col
                    transform transition-transform duration-200 ease-in-out
                    lg:relative lg:translate-x-0
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="h-16 lg:h-20 flex items-center justify-between px-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Shield size={16} className="text-white" />
                        </div>
                        <span className="font-bold tracking-wider">SIS ADMIN</span>
                    </div>
                    {/* Close button on mobile */}
                    <button
                        className="lg:hidden p-1 text-gray-400 hover:text-white"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                    <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Backoffice</p>
                    <SidebarLink href="/admin/trends" icon={<TrendingUp size={18} />} label="Trend Discovery" onNavigate={() => setSidebarOpen(false)} />
                    <SidebarLink href="/admin/knowledge" icon={<Database size={18} />} label="Knowledge Base" onNavigate={() => setSidebarOpen(false)} />
                    <SidebarLink href="/admin/fiches" icon={<FileText size={18} />} label="Fiches Verite" onNavigate={() => setSidebarOpen(false)} />
                    <SidebarLink href="/admin/social" icon={<Instagram size={18} />} label="Social Posts" onNavigate={() => setSidebarOpen(false)} />

                    <div className="my-6 border-t border-white/5" />

                    <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</p>
                    <SidebarLink href="/" icon={<Home size={18} />} label="Back to Website" onNavigate={() => setSidebarOpen(false)} />
                </div>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400">
                        <Settings size={16} />
                        <span>Settings</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile top bar with hamburger */}
                <header className="lg:hidden h-14 flex items-center justify-between px-4 border-b border-white/10 bg-[#0B1221] shrink-0">
                    <button
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu size={22} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded flex items-center justify-center">
                            <Shield size={12} className="text-white" />
                        </div>
                        <span className="font-bold text-sm tracking-wider">SIS ADMIN</span>
                    </div>
                    <div className="w-10" /> {/* Spacer for centering */}
                </header>

                <main className="flex-1 overflow-auto bg-[#050912]">
                    {children}
                </main>
            </div>
        </div>
    );
}

function SidebarLink({
    href,
    icon,
    label,
    onNavigate
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    onNavigate?: () => void;
}) {
    const pathname = usePathname();
    const active = (pathname?.startsWith(href) && href !== '/') || (href === '/' && pathname === '/');

    return (
        <Link
            href={href}
            onClick={onNavigate}
            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                ${active
                    ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
            `}
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
        </Link>
    );
}
