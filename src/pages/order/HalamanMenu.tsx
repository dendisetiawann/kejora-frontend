/* eslint-disable @next/next/no-img-element */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from '@/types/entities';
import { publicGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { CheckoutDraft, readCheckoutDraft, saveCheckoutDraft } from '@/lib/checkoutDraft';
import { resolveMenuPhoto } from '@/lib/menuPhoto';
import HalamanDetailMenu from './HalamanDetailMenu';

type CartItem = {
  menu: Menu;
  qty: number;
};

type CategoryFilter = {
  id_kategori: number;
  nama_kategori: string;
};

const TABLE_OPTIONS = Array.from({ length: 15 }, (_, index) => (index + 1).toString());

const ambilSemuaDataMenu = () => publicGet<Menu[]>('/public/menus');
const ambilSemuaMenu = () => ambilSemuaDataMenu();
const ambilDataMenu = (menuId: number) => publicGet<Menu>(`/public/menus/${menuId}`);

export default function HalamanMenu() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [cart, setCart] = useState<Record<number, CartItem>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailMenu, setDetailMenu] = useState<Menu | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [pendingDraft, setPendingDraft] = useState<CheckoutDraft | null>(null);
  const [draftApplied, setDraftApplied] = useState(false);
  const restoredInfoRef = useRef(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.classList.add('order-page-no-anim');
    return () => {
      document.body.classList.remove('order-page-no-anim');
    };
  }, []);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const statusParam = router.query.status;
    const statusValue = Array.isArray(statusParam) ? statusParam[0] : statusParam;
    if (statusValue?.toLowerCase() === 'success') {
      router.replace({ pathname: '/order/success', query: { status: 'success' } });
    }
  }, [router]);

  useEffect(() => {
    ambilSemuaMenu()
      .then((data) => {
        setMenus(data);
        setMenuError(null);
      })
      .catch(() => setMenuError('Gagal memuat menu.'))
      .finally(() => setLoadingMenu(false));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedDraft = readCheckoutDraft();
    const frame = window.requestAnimationFrame(() => {
      if (storedDraft) {
        setPendingDraft(storedDraft);
      } else {
        setDraftApplied(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!pendingDraft || draftApplied || menus.length === 0) {
      return;
    }

    const nextCart: Record<number, CartItem> = {};
    pendingDraft.items.forEach((item) => {
      const menu = menus.find((menuEntry) => menuEntry.id_menu === item.menu_id);
      if (menu) {
        nextCart[menu.id_menu] = { menu, qty: item.qty };
      }
    });

    const frame = window.requestAnimationFrame(() => {
      if (!restoredInfoRef.current && pendingDraft.items.length > 0) {
        if (!customerName && pendingDraft.customerName) {
          setCustomerName(pendingDraft.customerName);
        }
        if (!tableNumber && pendingDraft.tableNumber) {
          setTableNumber(pendingDraft.tableNumber);
        }
        restoredInfoRef.current = true;
      }

      if (Object.keys(nextCart).length > 0) {
        setCart(nextCart);
        setDrawerOpen(false);
      }

      setDraftApplied(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingDraft, draftApplied, menus, customerName, tableNumber]);

  // Smart Auto-Save
  useEffect(() => {
    if (!draftApplied) return;

    const currentItems = Object.values(cart).map((item) => ({
      menu_id: item.menu.id_menu,
      name: item.menu.nama_menu,
      price: item.menu.harga_menu,
      qty: item.qty,
    }));

    saveCheckoutDraft({
      customerName,
      tableNumber,
      items: currentItems,
      createdAt: new Date().toISOString(),
      paymentMethod: 'cash',
      orderNote: '',
    });
  }, [cart, customerName, tableNumber, draftApplied]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);



  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.menu.harga_menu * item.qty, 0),
    [cartItems]
  );
  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.qty, 0), [cartItems]);
  const hasCartItems = cartItems.length > 0;

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const categories = useMemo<CategoryFilter[]>(() => {
    const map = new Map<number, string>();
    menus.forEach((menu) => {
      if (menu.kategori?.id_kategori) {
        map.set(menu.kategori.id_kategori, menu.kategori.nama_kategori);
      }
    });
    return Array.from(map.entries()).map(([id_kategori, nama_kategori]) => ({ id_kategori, nama_kategori }));
  }, [menus]);

  const filteredMenus = useMemo(() => {
    if (activeCategory === 'all') {
      return menus;
    }
    return menus.filter((menu) => menu.id_kategori === activeCategory);
  }, [menus, activeCategory]);

  const updateQty = (menu: Menu, delta: number) => {
    setCart((prev) => {
      const current = prev[menu.id_menu];
      const nextQty = (current?.qty ?? 0) + delta;
      let nextState: Record<number, CartItem>;
      if (nextQty <= 0) {
        nextState = { ...prev };
        delete nextState[menu.id_menu];
      } else {
        nextState = {
          ...prev,
          [menu.id_menu]: { menu, qty: nextQty },
        };
      }
      if (Object.keys(nextState).length === 0) {
        setDrawerOpen(false);
      }
      return nextState;
    });
  };

  const removeItem = (menuId: number) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[menuId];
      if (Object.keys(updated).length === 0) {
        setDrawerOpen(false);
      }
      return updated;
    });
  };

  const handleOpenDetail = (menu: Menu) => {
    const cartItem = getMenuInCart(menu.id_menu);
    setDetailMenu(menu);
    setDetailQty(cartItem?.qty ?? 1);
  };

  const handleCloseDetail = () => {
    setDetailMenu(null);
    setDetailQty(1);
  };

  const handleAddDetailToCart = async () => {
    if (!detailMenu) {
      return;
    }

    try {
      const latestMenu = await ambilDataMenu(detailMenu.id_menu);
      const targetQty = Math.max(1, detailQty);

      setCart((prev) => ({
        ...prev,
        [latestMenu.id_menu]: {
          menu: latestMenu,
          qty: targetQty,
        },
      }));

      setToast('Menu berhasil ditambahkan ke keranjang');
      handleCloseDetail();
    } catch (error) {
      console.error('Gagal mengambil data menu terbaru', error);
      setToast('Gagal memperbarui data menu. Coba lagi.');
    }
  };

  const handleProceedToCheckout = () => {
    setFormError(null);
    if (!customerName.trim() || !tableNumber.trim()) {
      setFormError('Nama pelanggan dan nomor meja harus diisi.');
      const element = document.getElementById('customer-info-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    if (cartItems.length === 0) {
      setFormError('Keranjang masih kosong.');
      return;
    }

    const existingDraft = readCheckoutDraft();

    saveCheckoutDraft({
      customerName: customerName.trim(),
      tableNumber,
      items: cartItems.map((item) => ({
        menu_id: item.menu.id_menu,
        name: item.menu.nama_menu,
        price: item.menu.harga_menu,
        qty: item.qty,
      })),
      createdAt: new Date().toISOString(),
      paymentMethod: existingDraft?.paymentMethod ?? 'cash',
      orderNote: existingDraft?.orderNote ?? '',
    });

    router.push('/order/checkout');
  };

  const handleResetCart = () => {
    setCart({});
    setFormError(null);
    setDrawerOpen(false);
  };

  const handleOpenCart = () => {
    if (hasCartItems) {
      setDrawerOpen(true);
    }
  };

  const getMenuInCart = (menuId: number): CartItem | undefined => {
    return cart[menuId];
  };

  const tampilNotifikasiInputPelanggan = () => {
    if (!formError) return null;

    return (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2 animate-pulse">
        <i className="fas fa-exclamation-circle"></i>
        {formError}
      </div>
    );
  };

  const tampilHalamanMenu = () => (
    <>
      <Head>
        <title>Pemesanan - KejoraCash</title>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
          rel="stylesheet"
        />
      </Head>
      <style jsx global>{`
        body.order-page-no-anim *,
        body.order-page-no-anim *::before,
        body.order-page-no-anim *::after {
          transition: none !important;
          animation: none !important;
        }
      `}</style>
      <div className="min-h-screen bg-brand-light pb-32 font-sans">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-brand-DEFAULT flex items-center justify-center text-white font-bold text-lg">
                K
              </div>
              <span className="font-bold text-xl tracking-tight text-brand-dark">Kejora Café</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-semibold text-brand-dark">
                <i className="far fa-clock text-brand-DEFAULT"></i>
                <span>08:00 - 23:00</span>
                <span className="mx-1 text-gray-300">|</span>
                <span>Senin - Minggu</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero / Banner */}
        <div className="relative overflow-hidden bg-gray-900 py-16 px-4 sm:px-6 lg:px-8">
          {/* Futuristic Background Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/40 via-gray-900 to-gray-900"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

          <div className="relative max-w-7xl mx-auto text-center sm:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-4 tracking-tight drop-shadow-sm">
              Kejora Café <br className="hidden sm:block" />
              <span className="text-brand-accent drop-shadow-[0_0_15px_rgba(217,119,6,0.5)]">Sinari Harimu</span>
            </h1>
            <p className="text-gray-400 max-w-2xl text-lg sm:text-xl leading-relaxed">
              Nikmati cita rasa bintang dalam setiap tegukan. <br className="hidden sm:block" />
              Pesan sekarang, kami sajikan kehangatan untuk Anda.
            </p>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 space-y-8">
          {/* Customer Info Card */}
          <section id="customer-info-section" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
              <div className="h-10 w-10 rounded-full bg-brand-light flex items-center justify-center text-brand-DEFAULT">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-dark">Informasi Pesanan</h2>
                <p className="text-sm text-gray-500">Silakan isi data diri Anda</p>
              </div>
            </div>

            {tampilNotifikasiInputPelanggan()}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nama Pelanggan</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-DEFAULT focus:border-brand-DEFAULT transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nomor Meja</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    {/* Custom Table Icon */}
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M4 19h16v2H4zM20 12H4v5h2v-3h12v3h2zM18 6h-2.5c-.28 0-.5.22-.5.5v3c0 .28.22.5.5.5H18c1.38 0 2.5-1.12 2.5-2.5S19.38 6 18 6zm-5-4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-4 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zM2 12v-2h20v2H2z" />
                    </svg>
                  </div>
                  <select
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-DEFAULT focus:border-brand-DEFAULT transition-colors bg-gray-50 focus:bg-white appearance-none"
                  >
                    <option value="">Silakan pilih meja anda</option>
                    {TABLE_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        Meja {value}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Menu Section */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-brand-dark">Menu Favorit</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {loadingMenu ? 'Memuat menu...' : `Tersedia ${filteredMenus.length} pilihan menu`}
                </p>
              </div>

              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory === 'all'
                      ? 'bg-brand-accent text-brand-dark shadow-brand-accent/20'
                      : 'bg-white text-gray-600 border border-gray-200'
                      }`}
                  >
                    Semua
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id_kategori}
                      type="button"
                      onClick={() => setActiveCategory(category.id_kategori)}
                      className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeCategory === category.id_kategori
                        ? 'bg-brand-accent text-brand-dark shadow-brand-accent/20'
                        : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                    >
                      {category.nama_kategori}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {menuError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i>
                {menuError}
              </div>
            )}

            {loadingMenu ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={`skeleton-${index}`} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                    <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredMenus.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenus.map((menu) => {
                  const photo = resolveMenuPhoto(menu);
                  const cartItem = getMenuInCart(menu.id_menu);
                  const isInCart = !!cartItem;

                  return (
                    <article
                      key={menu.id_menu}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer relative"
                      onClick={() => handleOpenDetail(menu)}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src={photo}
                          alt={menu.nama_menu}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-brand-dark shadow-sm">
                            {menu.kategori?.nama_kategori ?? 'Menu'}
                          </span>
                        </div>

                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-bold text-lg text-brand-dark line-clamp-1 transition-colors" title={menu.nama_menu}>{menu.nama_menu}</h3>
                          <span className="font-bold text-brand-DEFAULT whitespace-nowrap">{formatCurrency(menu.harga_menu)}</span>
                        </div>


                        {isInCart ? (
                          /* In-Card Quantity Control (Only when in cart) */
                          <div className="mt-auto flex items-center justify-between bg-gray-50 rounded-lg p-1 border border-gray-200" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => updateQty(menu, -1)}
                              className="w-8 h-8 flex items-center justify-center text-brand-dark rounded-md"
                            >
                              <i className="fas fa-minus text-xs"></i>
                            </button>
                            <span className="font-bold text-brand-dark text-sm">{cartItem.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(menu, 1)}
                              className="w-8 h-8 flex items-center justify-center text-white bg-brand-dark rounded-md shadow-sm"
                            >
                              <i className="fas fa-plus text-xs"></i>
                            </button>
                          </div>
                        ) : (
                          /* Description (When not in cart) */
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2 min-h-[2.5rem]">
                            {menu.deskripsi_menu || 'Nikmati cita rasa istimewa dari menu andalan kami.'}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500 font-medium">Menu tidak ditemukan</p>
                <p className="text-sm text-gray-400">Coba cari dengan kata kunci lain</p>
              </div>
            )}
          </section>


        </main>



        {toast && (
          <div className="fixed top-6 inset-x-0 flex justify-center z-30 px-4">
            <div className="bg-brand-dark text-white px-4 py-2 rounded-full shadow-lg text-sm">{toast}</div>
          </div>
        )}

        {hasCartItems && (
          <div className="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-6 pt-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center justify-center h-14">
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full sm:w-64 bg-brand-dark text-white font-bold py-3.5 px-6 rounded-full shadow-lg shadow-brand-DEFAULT/30 flex items-center justify-center gap-2"
              >
                <span>Buat Pesanan</span>
              </button>

              <div
                className="fixed bottom-28 right-4 z-40 sm:absolute sm:bottom-auto sm:right-4 sm:z-auto flex items-center justify-center cursor-pointer"
                onClick={handleOpenCart}
              >
                <div className="relative h-12 w-12 rounded-full bg-brand-light flex items-center justify-center text-brand-dark">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    <path
                      d="M5 6h2l1.5 9h9L19 8H7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailMenu && (
          <HalamanDetailMenu
            menu={detailMenu}
            qty={detailQty}
            onQtyChange={setDetailQty}
            onClose={handleCloseDetail}
            onAddToCart={handleAddDetailToCart}
          />
        )}

        {drawerOpen && hasCartItems && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden="true">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)}></div>
            </div>
            <div className="fixed inset-y-0 right-0 z-50 flex max-w-full" role="dialog" aria-modal="true">
              <div className="w-full max-w-lg sm:max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                  <h2 className="text-lg font-bold text-brand-dark">Keranjang Pesanan</h2>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f8f8]">
                  {cartItems.map((item) => (
                    <div key={item.menu.id_menu} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-5 items-start">
                      <div className="h-20 w-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        <img src={resolveMenuPhoto(item.menu)} alt={item.menu.nama_menu} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-3">
                          <h4 className="font-bold text-brand-dark text-base line-clamp-1">{item.menu.nama_menu}</h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.menu.id_menu)}
                            className="text-gray-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50"
                          >
                            <i className="fas fa-trash-alt text-sm"></i>
                          </button>
                        </div>
                        <p className="text-sm text-brand-DEFAULT font-semibold">{formatCurrency(item.menu.harga_menu)}</p>

                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => updateQty(item.menu, -1)}
                            className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <i className="fas fa-minus text-xs"></i>
                          </button>
                          <span className="text-base font-bold text-brand-dark w-6 text-center">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.menu, 1)}
                            className="h-8 w-8 rounded-full bg-brand-dark text-white flex items-center justify-center hover:bg-brand-DEFAULT"
                          >
                            <i className="fas fa-plus text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 p-6 bg-white space-y-4">
                  <div className="space-y-2">
                    <div className="border-t border-dashed border-gray-200 my-2 pt-2 flex items-center justify-between text-lg">
                      <span className="font-bold text-brand-dark">Total</span>
                      <span className="font-bold text-brand-DEFAULT">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1">
                    <button
                      type="button"
                      onClick={handleResetCart}
                      className="py-3 rounded-xl border border-red-200 text-red-500 font-semibold text-sm"
                    >
                      Kosongkan Keranjang
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  return tampilHalamanMenu();
}
