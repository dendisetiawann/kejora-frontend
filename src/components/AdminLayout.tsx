import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import { adminGet, clearToken, getToken } from '@/lib/api';
import { User } from '@/types/entities';

type Props = {
  title: string;
  children: ReactNode;
};

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Menus', href: '/admin/menus' },
  { label: 'Categories', href: '/admin/categories' },
];

export default function AdminLayout({ title, children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    adminGet<User>('/admin/me')
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace('/admin/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-brand-dark text-lg font-semibold animate-pulse">Memuat panel admin...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title} • KejoraCash</title>
      </Head>
      <div className="min-h-screen bg-slate-50 flex">
        <aside className="w-64 bg-brand-dark text-white flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="text-2xl font-bold">KejoraCash</div>
            <p className="text-sm text-white/70 mt-1">Admin Panel</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = router.pathname === item.href || router.pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand-light/20 text-white' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-white/10">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-white/70 mb-3">{user?.username}</p>
            <button
              onClick={() => {
                clearToken();
                router.replace('/admin/login');
              }}
              className="w-full bg-white/10 hover:bg-white/20 text-sm font-semibold py-2 rounded-lg transition"
            >
              Keluar
            </button>
          </div>
        </aside>
        <section className="flex-1 flex flex-col">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
            <h1 className="text-lg font-semibold text-brand-dark">{title}</h1>
            <span className="text-sm text-slate-500">Selamat datang, {user?.name}</span>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </section>
      </div>
    </>
  );
}

