'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Database,
    Home,
    Settings,
    Shield,
    TrendingUp,
    FileText
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-[#050912] text-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-[#0B1221] flex flex-col">
                <div className="h-20 flex items-center px-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
                            <Shield size={16} className="text-white" />
                        </div>
                        <span className="font-bold tracking-wider">SIS ADMIN</span>
                    </div>
                </div>

                <div className="flex-1 py-6 px-4 space-y-1">
                    <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Backoffice</p>
                    <SidebarLink href="/admin/trends" icon={<TrendingUp size={18} />} label="Trend Discovery" />
                    <SidebarLink href="/admin/knowledge" icon={<Database size={18} />} label="Knowledge Base" />
                    <SidebarLink href="/admin/fiches" icon={<FileText size={18} />} label="Fiches Verite" />

                    <div className="my-6 border-t border-white/5" />

                    <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System</p>
                    <SidebarLink href="/" icon={<Home size={18} />} label="Back to Website" />
                </div>

                <div className="p-4 border-t border-white/10">
                    <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400">
                        <Settings size={16} />
                        <span>Settings</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto bg-[#050912]">
                {children}
            </main>
        </div>
    );
}

function SidebarLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    const pathname = usePathname();
    const active = (pathname?.startsWith(href) && href !== '/') || (href === '/' && pathname === '/');

    return (
        <Link
            href={href}
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
