/* eslint-disable @next/next/no-img-element */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Menu } from '@/types/entities';
import { publicGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { CheckoutDraft, readCheckoutDraft, saveCheckoutDraft } from '@/lib/checkoutDraft';

type CartItem = {
  menu: Menu;
  qty: number;
};

type CategoryFilter = {
  id: number;
  name: string;
};

const TABLE_OPTIONS = Array.from({ length: 15 }, (_, index) => (index + 1).toString());
const IMAGE_BASE_URL = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? '').replace(/\/$/, '');

const resolveMenuPhoto = (menu: Menu): string => {
  const available = menu.photo_path?.trim();
  if (available) {
    if (/^https?:\/\//i.test(available)) {
      return available;
    }
    if (IMAGE_BASE_URL) {
      const sanitized = available.replace(/^\//, '');
      return `${IMAGE_BASE_URL}/${sanitized}`;
    }
    return available;
  }
  return `https://picsum.photos/seed/kejora-${menu.id}/600/400`;
};

export default function OrderPage() {
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
    publicGet<Menu[]>('/public/menus')
      .then((data) => {
        setMenus(data);
        setMenuError(null);
      })
      .catch(() => setMenuError('Gagal memuat menu.'))
      .finally(() => setLoadingMenu(false));
  }, []);

  useEffect(() => {
    const storedDraft = readCheckoutDraft();
    if (storedDraft && storedDraft.items.length > 0) {
      setPendingDraft(storedDraft);
    }
  }, []);

  useEffect(() => {
    if (!pendingDraft || draftApplied || menus.length === 0) {
      return;
    }

    if (!customerName) {
      setCustomerName(pendingDraft.customerName ?? '');
    }
    if (!tableNumber) {
      setTableNumber(pendingDraft.tableNumber ?? '');
    }

    const nextCart: Record<number, CartItem> = {};
    pendingDraft.items.forEach((item) => {
      const menu = menus.find((menuEntry) => menuEntry.id === item.menu_id);
      if (menu) {
        nextCart[menu.id] = { menu, qty: item.qty };
      }
    });

    if (Object.keys(nextCart).length > 0) {
      setCart(nextCart);
      setDrawerOpen(false);
    }

    setDraftApplied(true);
  }, [pendingDraft, draftApplied, menus, customerName, tableNumber]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.menu.price * item.qty, 0),
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
      if (menu.category?.id) {
        map.set(menu.category.id, menu.category.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [menus]);

  const filteredMenus = useMemo(() => {
    if (activeCategory === 'all') {
      return menus;
    }
    return menus.filter((menu) => menu.category_id === activeCategory);
  }, [menus, activeCategory]);

  const updateQty = (menu: Menu, delta: number) => {
    setCart((prev) => {
      const current = prev[menu.id];
      const nextQty = (current?.qty ?? 0) + delta;
      let nextState: Record<number, CartItem>;
      if (nextQty <= 0) {
        nextState = { ...prev };
        delete nextState[menu.id];
      } else {
        nextState = {
          ...prev,
          [menu.id]: { menu, qty: nextQty },
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

  const handleAddMenu = (menu: Menu) => {
    updateQty(menu, 1);
    setToast('Menu berhasil ditambahkan ke keranjang');
  };

  const handleOpenDetail = (menu: Menu) => {
    const cartItem = getMenuInCart(menu.id);
    setDetailMenu(menu);
    setDetailQty(cartItem?.qty ?? 1);
  };

  const handleCloseDetail = () => {
    setDetailMenu(null);
    setDetailQty(1);
  };

  const handleAddDetailToCart = () => {
    if (!detailMenu) {
      return;
    }
    const targetQty = Math.max(1, detailQty);
    setCart((prev) => ({
      ...prev,
      [detailMenu.id]: {
        menu: detailMenu,
        qty: targetQty,
      },
    }));
    setToast('Menu berhasil ditambahkan ke keranjang');
    handleCloseDetail();
  };

  const handleProceedToCheckout = () => {
    setFormError(null);
    if (!customerName.trim() || !tableNumber.trim()) {
      setFormError('Nama pelanggan dan nomor meja harus diisi.');
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
        menu_id: item.menu.id,
        name: item.menu.name,
        price: item.menu.price,
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

  return (
    <>
      <Head>
        <title>Pemesanan - KejoraCash</title>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
          rel="stylesheet"
        />
      </Head>
      <div className="relative min-h-screen bg-gradient-to-br from-brand-light via-white to-[#f0fff6] pb-40 transition-colors">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 right-0 w-72 h-72 rounded-full bg-brand-accent/40 blur-3xl" />
          <div className="absolute top-1/3 -left-16 w-80 h-80 rounded-full bg-[#c8f5d8] opacity-50 blur-[120px]" />
        </div>
        <header className="relative overflow-hidden bg-gradient-to-br from-[#1F3D2B] via-[#3B8D68] to-[#6ED3A5] text-white shadow-2xl rounded-b-[2.5rem] border-b border-white/10">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 right-6 w-48 h-48 rounded-full bg-white/40 blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-white/25 blur-[150px]" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.5em] text-white/70">Kejora Cafe</p>
              <h1 className="text-3xl font-semibold tracking-tight">Digital Menu &amp; Order</h1>
              <p className="text-sm text-white/80 max-w-xl">
                Nikmati pengalaman memesan yang lebih modern dengan tampilan bersih, warna hangat, dan keranjang belanja yang selalu siap di sudut atas layar.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                {['QRIS Ready', 'Table Service', 'Freshly Brewed'].map((label) => (
                  <span key={label} className="rounded-full bg-white/15 px-3 py-1 tracking-widest text-white/80">
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex flex-col text-right text-sm text-white/80">
              <span className="uppercase tracking-[0.4em] text-white/60 text-xs">Status</span>
              <span>Menu selalu diperbarui</span>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-6xl mx-auto px-4 -mt-12 space-y-8">
          <section className="backdrop-blur-xl bg-white/90 rounded-3xl shadow-[0_25px_80px_rgba(15,23,42,0.08)] p-6 border border-brand-light/60">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-brand-dark to-brand-accent text-white flex items-center justify-center shadow-lg">
                <i className="fas fa-user"></i>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Data Pelanggan</p>
                <p className="text-sm text-brand-dark/70">
                  Isi detail terlebih dahulu agar pesanan tersimpan rapi.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-brand-dark">
                Nama Pelanggan
                <div className="flex items-center gap-3 rounded-2xl border border-brand-light/70 bg-white/80 px-4 py-3 focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/30 transition">
                  <span className="h-9 w-9 rounded-xl bg-brand-light flex items-center justify-center text-brand-accent text-base">
                    👤
                  </span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Contoh: Rina"
                    className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-brand-dark">
                Nomor Meja
                <div className="flex items-center gap-3 rounded-2xl border border-brand-light/70 bg-white/80 px-4 py-3 focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/30 transition">
                  <span className="h-9 w-9 rounded-xl bg-brand-light flex items-center justify-center text-brand-accent text-base">
                    🪑
                  </span>
                  <select
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    className="flex-1 bg-transparent focus:outline-none text-gray-900"
                  >
                    <option value="">Pilih meja 1 - 15</option>
                    {TABLE_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        Meja {value}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
          </section>

          <section className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-[0_25px_80px_rgba(15,23,42,0.08)] p-6 space-y-6 border border-brand-light/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Daftar Menu</p>
                <h2 className="text-2xl font-semibold text-brand-dark">Pilih favoritmu</h2>
                <p className="text-sm text-brand-dark/70">
                  {loadingMenu ? 'Sedang memuat...' : `Menampilkan ${filteredMenus.length} menu tersedia.`}
                </p>
              </div>
              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                      activeCategory === 'all'
                        ? 'bg-brand-dark text-white border-brand-dark'
                        : 'border-brand-light/70 text-brand-dark/70 hover:border-brand-accent'
                    }`}
                  >
                    Semua
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategory(category.id)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                        activeCategory === category.id
                          ? 'bg-brand-accent text-white border-brand-accent'
                          : 'border-brand-light/70 text-brand-dark/70 hover:border-brand-accent'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {menuError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{menuError}</div>
            )}

            {loadingMenu ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(4)].map((_, index) => (
                  <div key={`skeleton-${index}`} className="h-56 rounded-3xl bg-brand-light/60 animate-pulse" />
                ))}
              </div>
            ) : filteredMenus.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredMenus.map((menu) => {
                  const photo = resolveMenuPhoto(menu);
                  const cartItem = getMenuInCart(menu.id);
                  const isInCart = !!cartItem;

                  return (
                    <article
                      key={menu.id}
                      className="rounded-3xl border border-brand-light/70 p-4 flex flex-col gap-4 hover:shadow-[0_20px_40px_rgba(63,163,114,0.25)] transition bg-white/95"
                    >
                      <div className="h-40 rounded-2xl overflow-hidden bg-gradient-to-tr from-brand-light to-white border border-brand-light/70">
                        <img src={photo} alt={menu.name} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-brand-dark">{menu.name}</h3>
                          {menu.category?.name && (
                            <span className="text-xs uppercase tracking-wide text-brand-accent">{menu.category.name}</span>
                          )}
                        </div>
                        <span className="text-base font-semibold text-brand-dark">{formatCurrency(menu.price)}</span>
                      </div>
                      <p className="text-sm text-brand-dark/70 min-h-[48px]">
                        {menu.description ?? 'Deskripsi menu akan segera diperbarui.'}
                      </p>
                      <div className="flex items-center justify-center w-full min-h-[36px] gap-2">
                        {!isInCart ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenDetail(menu);
                            }}
                            className="bg-gradient-to-r from-brand-dark to-brand-accent text-white text-sm font-semibold px-4 py-2 rounded-2xl cursor-pointer w-full block transition-all hover:shadow-lg hover:scale-[1.02]"
                          >
                            Tambah
                          </button>
                        ) : (
                          <div className="flex items-center justify-between border border-brand-dark/60 rounded-2xl h-11 w-full bg-white transition-all">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateQty(menu, -1);
                              }}
                              className="bg-none border-none text-brand-dark px-4 cursor-pointer text-lg h-full min-w-[44px] flex items-center justify-center transition-all hover:bg-brand-dark/10 active:scale-95"
                            >
                              <i className="fas fa-minus"></i>
                            </button>
                            <span className="font-semibold text-base text-brand-dark min-w-[48px] text-center flex-1">
                              {cartItem.qty}
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateQty(menu, 1);
                              }}
                              className="bg-none border-none text-brand-dark px-4 cursor-pointer text-lg h-full min-w-[44px] flex items-center justify-center transition-all hover:bg-brand-dark/10 active:scale-95"
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-sm text-brand-dark/70 py-6">Menu tidak ditemukan. Coba ubah kata kunci.</div>
            )}
          </section>

          {formError && (
            <div className="rounded-3xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{formError}</div>
          )}
        </main>

        {toast && (
          <div className="fixed top-6 inset-x-0 flex justify-center z-30 px-4">
            <div className="bg-brand-dark text-white px-4 py-2 rounded-full shadow-lg text-sm">{toast}</div>
          </div>
        )}

        {hasCartItems && (
          <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white/95 to-transparent pb-6 pt-4 transition-colors">
            <div className="flex justify-end w-full px-4 sm:px-8">
              <button
                type="button"
                onClick={handleOpenCart}
                className="relative h-14 w-14 rounded-2xl bg-white border border-brand-light shadow-lg flex items-center justify-center text-brand-dark transition-colors"
                aria-label="Buka keranjang"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d="M5 6h2l1.5 9h9L19 8H7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="absolute -top-1 -right-1 rounded-full bg-brand-accent text-white text-xs font-semibold px-1.5 py-[2px]">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              </button>
            </div>
            <div className="px-4 sm:px-8 mt-3">
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full max-w-5xl mx-auto bg-brand-accent hover:bg-brand-dark text-white font-semibold py-4 rounded-3xl shadow-2xl text-lg block"
              >
                Buat Pesanan ({cartCount} item)
              </button>
            </div>
          </div>
        )}

        {detailMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Detail Menu</p>
                  <h3 className="text-2xl font-semibold text-brand-dark">{detailMenu.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="h-10 w-10 rounded-full border border-brand-light/70 text-lg text-brand-dark"
                  aria-label="Tutup detail menu"
                >
                  ×
                </button>
              </div>
              <div className="h-48 w-full overflow-hidden rounded-2xl border border-brand-light/70">
                <img src={detailMenu.photo_path ? resolveMenuPhoto(detailMenu) : `https://picsum.photos/seed/kejora-${detailMenu.id}/600/400`} alt={detailMenu.name} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-brand-dark/70">
                  {detailMenu.description ?? 'Deskripsi menu akan segera diperbarui.'}
                </p>
                <p className="text-lg font-semibold text-brand-dark">{formatCurrency(detailMenu.price)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-brand-dark">Jumlah</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailQty((prev) => Math.max(1, prev - 1))}
                    className="h-10 w-10 rounded-full border border-brand-light/70 text-lg"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold text-brand-dark">{detailQty}</span>
                  <button
                    type="button"
                    onClick={() => setDetailQty((prev) => prev + 1)}
                    className="h-10 w-10 rounded-full bg-brand-accent text-white"
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddDetailToCart}
                className="w-full rounded-2xl bg-gradient-to-r from-brand-dark to-brand-accent text-white font-semibold py-3"
              >
                Tambah ke Keranjang
              </button>
            </div>
          </div>
        )}

        {drawerOpen && hasCartItems && (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/40" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white h-full sm:h-auto sm:my-8 rounded-l-3xl shadow-2xl flex flex-col transition-colors">
              <div className="p-6 border-b border-brand-light flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Keranjang</p>
                  <h2 className="text-xl font-semibold text-brand-dark">Edit atau hapus pesanan</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Tutup keranjang"
                  className="h-10 w-10 rounded-full border border-brand-light/70 hover:border-brand-dark text-lg text-brand-dark transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.menu.id} className="rounded-2xl border border-brand-light/70 p-4 space-y-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-brand-dark">{item.menu.name}</p>
                        <p className="text-xs text-brand-dark/70">{formatCurrency(item.menu.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.menu.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        Hapus
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateQty(item.menu, -1)}
                        className="h-8 w-8 rounded-full border border-brand-light/70 hover:border-brand-dark flex items-center justify-center text-brand-dark transition-colors"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold w-8 text-center text-brand-dark">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.menu, 1)}
                        className="h-8 w-8 rounded-full bg-brand-accent hover:bg-brand-dark text-white flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-brand-light dark:border-orange-500/20 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-dark/70 dark:text-orange-200/80">Total pembayaran</p>
                    <p className="text-2xl font-semibold text-brand-dark dark:text-orange-200">{formatCurrency(cartTotal)}</p>
                  </div>
                  <button type="button" onClick={handleResetCart} className="text-sm font-semibold text-red-500 hover:text-red-600">
                    Hapus Semua
                  </button>
                </div>
                <p className="text-xs text-brand-dark/70 dark:text-orange-200/80">
                  Gunakan tombol &quot;Buat Pesanan&quot; di bagian bawah untuk melanjutkan checkout setelah selesai mengedit.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
