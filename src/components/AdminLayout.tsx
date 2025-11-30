import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import { adminGet, clearToken, getToken } from '@/lib/api';
import { useNotification } from '@/contexts/NotificationContext';
import { Pengguna } from '@/types/entities';

type Props = {
  title: string;
  children: ReactNode;
};

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'fa-tachometer-alt' },
  { label: 'Kelola Pesanan', href: '/admin/kelolapesanan', icon: 'fa-clipboard-list' },
  { label: 'Kelola Menu', href: '/admin/kelolamenu', icon: 'fa-utensils' },
  { label: 'Kelola Kategori', href: '/admin/kelolakategori', icon: 'fa-layer-group' },
];

export default function AdminLayout({ title, children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<Pengguna | null>(null);
  const { unreadCount, showBanner, latestOrder, dismissBanner, clearUnread } = useNotification();
  const [loading, setLoading] = useState(true);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#admin-menu-dropdown') && !target.closest('#admin-menu-button')) {
        setIsMenuOpen(false);
      }
      if (!target.closest('#notification-dropdown') && !target.closest('#notification-button')) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    adminGet<Pengguna>('/admin/me')
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
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
          rel="stylesheet"
        />
      </Head>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {showBanner && latestOrder && (
          <div className="fixed top-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in-down">
            <div className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-dark">
                <i className="fas fa-bell text-brand-accent"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-brand-dark">Pesanan Baru!</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  Pesanan baru dari{' '}
                  <span className="font-medium text-gray-700">{latestOrder.nama_pelanggan || latestOrder.pelanggan?.nama_pelanggan || 'Pelanggan'}</span>
                </p>
                <div className="mt-2 flex gap-3">
                  <Link
                    href={`/admin/kelolapesanan/${latestOrder.id_pesanan}`}
                    onClick={dismissBanner}
                    className="text-xs font-semibold text-brand-accent hover:text-brand-dark transition-colors"
                  >
                    Lihat Detail
                  </Link>
                  <button
                    onClick={dismissBanner}
                    className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
              <button onClick={dismissBanner} className="text-gray-300 hover:text-gray-500">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="h-1 bg-brand-accent/20 w-full">
              <div className="h-full bg-brand-accent w-full animate-[shrink_30s_linear_forwards]"></div>
            </div>
          </div>
        )}

        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-xl font-bold text-brand-dark hover:text-brand-DEFAULT transition-colors">
              KejoraCash <span className="text-brand-accent font-normal text-sm">Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                id="notification-button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`relative h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors focus:outline-none ${isNotificationOpen ? 'bg-gray-100 text-brand-dark' : 'text-gray-500'}`}
              >
                <i className="fas fa-bell text-lg"></i>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
                )}
              </button>

              {isNotificationOpen && (
                <div
                  id="notification-dropdown"
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in-down origin-top-right z-50"
                >
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-brand-dark">Notifikasi</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={clearUnread}
                        className="text-xs text-brand-accent hover:text-brand-dark font-medium"
                      >
                        Tandai sudah dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {unreadCount > 0 ? (
                      <div className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => {
                        router.push('/admin/kelolapesanan');
                        setIsNotificationOpen(false);
                      }}>
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-dark shrink-0">
                            <i className="fas fa-clipboard-list text-xs"></i>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Pesanan Baru Masuk</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Anda memiliki <span className="font-bold text-brand-dark">{unreadCount}</span> pesanan baru yang belum dilihat.
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">Baru saja</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-400">
                        <i className="fas fa-bell-slash text-2xl mb-2 opacity-50"></i>
                        <p className="text-xs">Belum ada notifikasi baru</p>
                      </div>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <div className="border-t border-gray-100 p-2">
                      <Link
                        href="/admin/kelolapesanan"
                        onClick={() => setIsNotificationOpen(false)}
                        className="block w-full text-center py-2 text-xs font-semibold text-brand-dark hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Lihat Semua Pesanan
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <span className="hidden sm:block text-sm text-slate-500">Halo, {user?.nama_pengguna}</span>

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
                    <p className="text-sm font-semibold text-brand-dark">{user?.nama_pengguna}</p>
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
