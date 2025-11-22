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
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'fa-tachometer-alt' },
  { label: 'Kelola Pesanan', href: '/admin/orders', icon: 'fa-clipboard-list' },
  { label: 'Kelola Menu', href: '/admin/menus', icon: 'fa-utensils' },
  { label: 'Kelola Kategori', href: '/admin/categories', icon: 'fa-layer-group' },
];

export default function AdminLayout({ title, children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#admin-menu-dropdown') && !target.closest('#admin-menu-button')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
          rel="stylesheet"
        />
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-xl font-bold text-brand-dark hover:text-brand-DEFAULT transition-colors">
              KejoraCash <span className="text-brand-accent font-normal text-sm">Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-slate-500">Halo, {user?.name}</span>

            <div className="relative">
              <button
                id="admin-menu-button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-brand-dark transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                <i className="fas fa-list-ul text-lg"></i>
              </button>

              {isMenuOpen && (
                <div
                  id="admin-menu-dropdown"
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in-down origin-top-right z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                    <p className="text-sm font-semibold text-brand-dark">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.username}</p>
                  </div>

                  <div className="py-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${router.pathname === item.href ? 'text-brand-accent font-semibold bg-brand-accent/5' : 'text-gray-700'
                          }`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className={`w-6 flex justify-center ${router.pathname === item.href ? 'text-brand-accent' : 'text-gray-400'}`}>
                          <i className={`fas ${item.icon}`}></i>
                        </div>
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        clearToken();
                        router.replace('/admin/login');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-3"
                    >
                      <div className="w-6 flex justify-center text-red-500">
                        <i className="fas fa-sign-out-alt"></i>
                      </div>
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </>
  );
}
