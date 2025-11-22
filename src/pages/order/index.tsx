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
  // User reported old photos are broken, so we ignore menu.photo_path entirely
  // and force internet references for everything.

  const name = menu.name.toLowerCase();

  // --- COFFEE (HOT) ---
  if (name.includes('cappuccino')) return 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80';
  if (name.includes('latte') && !name.includes('ice')) return 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?auto=format&fit=crop&w=800&q=80';
  if (name.includes('espresso')) return 'https://images.unsplash.com/photo-1579992357154-faf4bde95b3d?auto=format&fit=crop&w=800&q=80';
  if (name.includes('americano') && !name.includes('ice')) return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80';
  if (name.includes('mocha') || name.includes('mocca')) return 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=800&q=80';
  if (name.includes('macchiato')) return 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?auto=format&fit=crop&w=800&q=80';
  if (name.includes('flat white')) return 'https://images.unsplash.com/photo-1572286258217-145c8814e41c?auto=format&fit=crop&w=800&q=80';
  if (name.includes('piccolo')) return 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=80';
  if (name.includes('affogato')) return 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=800&q=80';
  if (name.includes('kopi susu') || name.includes('kopi gula')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80';
  if (name.includes('kopi hitam') || (name.includes('kopi') && name.includes('hitam'))) return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80';
  if (name.includes('tubruk')) return 'https://images.unsplash.com/photo-1518832553480-cd0e625ed3e6?auto=format&fit=crop&w=800&q=80';
  if (name.includes('v60') || name.includes('manual brew')) return 'https://images.unsplash.com/photo-1498603536246-15572faa67a6?auto=format&fit=crop&w=800&q=80';
  if (name.includes('vietnam drip')) return 'https://images.unsplash.com/photo-1565458318272-3343a7e2c74d?auto=format&fit=crop&w=800&q=80';

  // --- COFFEE (ICED) ---
  if (name.includes('ice') && (name.includes('latte') || name.includes('lat'))) return 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?auto=format&fit=crop&w=800&q=80';
  if (name.includes('ice') && name.includes('americano')) return 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?auto=format&fit=crop&w=800&q=80';
  if (name.includes('ice') && (name.includes('coffee') || name.includes('kopi'))) return 'https://images.unsplash.com/photo-1461023058943-48dbf94565b0?auto=format&fit=crop&w=800&q=80';
  if (name.includes('cold brew')) return 'https://images.unsplash.com/photo-1517959105821-eaf2591984ca?auto=format&fit=crop&w=800&q=80';
  if (name.includes('frappe') || name.includes('frappuccino')) return 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80';

  // --- TEA & MILK ---
  if (name.includes('matcha') && name.includes('latte')) return 'https://images.unsplash.com/photo-1536013266021-c80a2e3a2f0c?auto=format&fit=crop&w=800&q=80';
  if (name.includes('matcha')) return 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=800&q=80';
  if (name.includes('thai tea') || name.includes('teh thai')) return 'https://images.unsplash.com/photo-1576092768581-7b2d3f5cb4f1?auto=format&fit=crop&w=800&q=80';
  if (name.includes('green tea') || name.includes('teh hijau')) return 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=800&q=80';
  if (name.includes('lemon tea') || name.includes('teh lemon')) return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80';
  if (name.includes('lychee tea') || name.includes('leci')) return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80';
  if (name.includes('milk tea')) return 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=800&q=80';
  if (name.includes('tea') || name.includes('teh')) return 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80';
  if (name.includes('chocolate') || name.includes('coklat')) return 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=800&q=80';
  if (name.includes('red velvet')) return 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?auto=format&fit=crop&w=800&q=80';
  if (name.includes('taro')) return 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=800&q=80'; // Purple drink generic

  // --- REFRESHERS ---
  if (name.includes('milkshake') || name.includes('milk shake')) return 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=800&q=80';
  if (name.includes('smoothie')) return 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=800&q=80';
  if (name.includes('juice') || name.includes('jus')) return 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80';
  if (name.includes('mojito') || name.includes('soda')) return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80';
  if (name.includes('squash')) return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80';

  // --- MAIN COURSE (RICE) ---
  if (name.includes('nasi goreng')) return 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80';
  if (name.includes('rice bowl')) return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80';
  if (name.includes('chicken katsu') || name.includes('katsu')) return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80';
  if (name.includes('teriyaki')) return 'https://images.unsplash.com/photo-1580476262716-6b3693166861?auto=format&fit=crop&w=800&q=80';
  if (name.includes('nasi ayam') || name.includes('chicken rice')) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80';
  if (name.includes('nasi')) return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80';

  // --- MAIN COURSE (NOODLES) ---
  if (name.includes('mie goreng') || name.includes('mi goreng')) return 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80';
  if (name.includes('ramen')) return 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80';
  if (name.includes('pasta') || name.includes('spaghetti') || name.includes('carbonara') || name.includes('bolognese')) return 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80';
  if (name.includes('mie') || name.includes('mi') || name.includes('noodle')) return 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=800&q=80';

  // --- SNACKS & LIGHT BITES ---
  if (name.includes('croissant')) return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80';
  if (name.includes('sandwich') || name.includes('sandwic')) return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80';
  if (name.includes('burger')) return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80';
  if (name.includes('toast') || name.includes('roti bakar')) return 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80';
  if (name.includes('roti') || name.includes('bread')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80';
  if (name.includes('donut') || name.includes('donat')) return 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80';
  if (name.includes('kentang') || name.includes('french fries') || name.includes('fries')) return 'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=800&q=80';
  if (name.includes('nugget')) return 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80';
  if (name.includes('onion ring')) return 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=80';
  if (name.includes('dimsum') || name.includes('siomay')) return 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80';
  if (name.includes('salad')) return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80';
  if (name.includes('soup') || name.includes('sup')) return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80';

  // --- DESSERTS ---
  if (name.includes('cake') || name.includes('kue')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80';
  if (name.includes('tiramisu')) return 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80';
  if (name.includes('cheesecake')) return 'https://images.unsplash.com/photo-1524351199678-941a58a3df50?auto=format&fit=crop&w=800&q=80';
  if (name.includes('brownie')) return 'https://images.unsplash.com/photo-1607920591413-4ec007e70023?auto=format&fit=crop&w=800&q=80';
  if (name.includes('cookie') || name.includes('kuki')) return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80';
  if (name.includes('waffle')) return 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=800&q=80';
  if (name.includes('pancake')) return 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=800&q=80';
  if (name.includes('ice cream') || name.includes('es krim')) return 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=800&q=80';

  // --- FALLBACKS ---
  // If it's a drink but unknown
  if (name.includes('ice') || name.includes('es ')) return 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=800&q=80';

  // Generic Food Fallback
  if (name.includes('paket') || name.includes('combo')) return 'https://images.unsplash.com/photo-1544025162-d76690b67f61?auto=format&fit=crop&w=800&q=80';

  // Ultimate Fallback (Cafe Ambience / Generic Coffee)
  return `https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80`;
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
    if (storedDraft) {
      setPendingDraft(storedDraft);
    } else {
      setDraftApplied(true);
    }
  }, []);

  useEffect(() => {
    if (!pendingDraft || draftApplied || menus.length === 0) {
      return;
    }

    // Only restore name/table if there are actually items in the cart.
    // If the cart is empty, we assume a fresh session and don't auto-fill user details.
    if (pendingDraft.items.length > 0) {
      if (!customerName && pendingDraft.customerName) {
        setCustomerName(pendingDraft.customerName);
      }
      if (!tableNumber && pendingDraft.tableNumber) {
        setTableNumber(pendingDraft.tableNumber);
      }
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

  // Smart Auto-Save
  useEffect(() => {
    if (!draftApplied) return;

    const currentItems = Object.values(cart).map((item) => ({
      menu_id: item.menu.id,
      name: item.menu.name,
      price: item.menu.price,
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
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-brand-dark/60">
                <span>Senin - Minggu</span>
                <span className="h-1 w-1 rounded-full bg-brand-dark/30"></span>
                <span>08:00 - 22:00</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero / Banner */}
        <div className="bg-brand-dark text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
          <div className="relative max-w-7xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">Order & Enjoy</h1>
            <p className="text-brand-light/80 max-w-xl text-lg">
              Nikmati kopi favoritmu tanpa antri. Pesan sekarang, kami siapkan dengan sepenuh hati.
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

            {formError && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2 animate-pulse">
                <i className="fas fa-exclamation-circle"></i>
                {formError}
              </div>
            )}

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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
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
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeCategory === 'all'
                      ? 'bg-brand-accent text-brand-dark shadow-md shadow-brand-accent/20'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                  >
                    Semua
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveCategory(category.id)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeCategory === category.id
                        ? 'bg-brand-accent text-brand-dark shadow-md shadow-brand-accent/20'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                      {category.name}
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
                  const cartItem = getMenuInCart(menu.id);
                  const isInCart = !!cartItem;

                  return (
                    <article
                      key={menu.id}
                      className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer relative"
                      onClick={() => handleOpenDetail(menu)}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src={photo}
                          alt={menu.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-brand-dark shadow-sm">
                            {menu.category?.name ?? 'Menu'}
                          </span>
                        </div>
                        {isInCart && (
                          <div className="absolute bottom-3 right-3 bg-brand-DEFAULT text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg">
                            {cartItem.qty}x di Keranjang
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-bold text-lg text-brand-dark line-clamp-1 transition-colors" title={menu.name}>{menu.name}</h3>
                          <span className="font-bold text-brand-DEFAULT whitespace-nowrap">{formatCurrency(menu.price)}</span>
                        </div>



                        {/* Minimalist interaction hint */}
                        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-medium text-gray-400 transition-colors">
                          <span>Klik untuk detail</span>
                          <i className="fas fa-arrow-right opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0"></i>
                        </div>
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

              {/* Centered Pay Button */}
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full sm:w-64 bg-brand-dark text-white font-bold py-3.5 px-6 rounded-full shadow-lg shadow-brand-DEFAULT/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Bayar Sekarang</span>
              </button>

              {/* Right-aligned Cart Icon */}
              <div
                className="absolute right-4 flex items-center justify-center cursor-pointer group"
                onClick={handleOpenCart}
              >
                <div className="relative h-12 w-12 rounded-full bg-brand-light flex items-center justify-center text-brand-dark group-hover:bg-brand-accent/20 transition-colors">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="relative h-64 bg-gray-100">
                <img
                  src={detailMenu.photo_path ? resolveMenuPhoto(detailMenu) : `https://picsum.photos/seed/kejora-${detailMenu.id}/600/400`}
                  alt={detailMenu.name}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="p-6 flex flex-col flex-1 overflow-y-auto">
                <div className="mb-4">
                  <span className="text-xs font-bold tracking-wider text-brand-accent uppercase mb-1 block">{detailMenu.category?.name ?? 'Menu'}</span>
                  <h3 className="text-2xl font-bold text-brand-dark mb-2">{detailMenu.name}</h3>
                  <p className="text-xl font-semibold text-brand-DEFAULT">{formatCurrency(detailMenu.price)}</p>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {detailMenu.description ?? 'Deskripsi menu akan segera diperbarui.'}
                </p>

                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm font-medium text-gray-700">Jumlah Pesanan</span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setDetailQty((prev) => Math.max(1, prev - 1))}
                        className="h-10 w-10 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-brand-dark hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <i className="fas fa-minus text-sm"></i>
                      </button>
                      <span className="w-8 text-center font-bold text-xl text-brand-dark">{detailQty}</span>
                      <button
                        type="button"
                        onClick={() => setDetailQty((prev) => prev + 1)}
                        className="h-10 w-10 rounded-lg flex items-center justify-center bg-brand-dark text-white hover:bg-brand-DEFAULT transition-colors shadow-sm"
                      >
                        <i className="fas fa-plus text-sm"></i>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDetailToCart}
                    className="w-full bg-brand-dark text-white font-bold py-3.5 rounded-xl hover:bg-brand-DEFAULT transition-colors shadow-lg"
                  >
                    Tambah ke Keranjang - {formatCurrency(detailMenu.price * detailQty)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {drawerOpen && hasCartItems && (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <h2 className="text-lg font-bold text-brand-dark">Keranjang Pesanan</h2>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8f8f8]">
                {cartItems.map((item) => (
                  <div key={item.menu.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4">
                    <div className="h-16 w-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      <img src={resolveMenuPhoto(item.menu)} alt={item.menu.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-brand-dark text-sm line-clamp-1">{item.menu.name}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.menu.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                      <p className="text-xs text-brand-DEFAULT font-semibold">{formatCurrency(item.menu.price)}</p>

                      <div className="flex items-center justify-end gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => updateQty(item.menu, -1)}
                          className="h-6 w-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          <i className="fas fa-minus text-[10px]"></i>
                        </button>
                        <span className="text-sm font-bold text-brand-dark w-4 text-center">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.menu, 1)}
                          className="h-6 w-6 rounded-full bg-brand-dark text-white flex items-center justify-center hover:bg-brand-DEFAULT"
                        >
                          <i className="fas fa-plus text-[10px]"></i>
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

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={handleResetCart}
                    className="py-3 rounded-xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors"
                  >
                    Kosongkan Keranjang
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div >
    </>
  );
}
