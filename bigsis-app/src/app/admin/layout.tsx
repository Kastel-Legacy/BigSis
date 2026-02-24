'use client';

import AdminGate from '@/components/AdminGate';
import AdminLayoutInner from '@/layouts/AdminLayout';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGate>
            <AdminLayoutInner>{children}</AdminLayoutInner>
        </AdminGate>
    );
}
