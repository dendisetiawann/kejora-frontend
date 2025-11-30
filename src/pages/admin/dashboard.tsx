import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { adminGet } from '@/lib/api';
import { Pesanan, Menu, Kategori } from '@/types/entities';
import { formatCurrency } from '@/lib/format';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    ordersCount: 0,
    revenue: 0,
    menusCount: 0,
    categoriesCount: 0,
    itemsSold: 0,
    bestSeller: '-' as string,
    chartData: [] as { day: number; revenue: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orders, menus, categories] = await Promise.all([
          adminGet<Pesanan[]>('/admin/kelolapesanan'),
          adminGet<Menu[]>('/admin/kelolamenu'),
          adminGet<Kategori[]>('/admin/kelolakategori'),
        ]);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyOrders = orders.filter((o) => {
          const orderDate = new Date(o.tanggal_dibuat || '');
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });

        const revenue = monthlyOrders
          .filter(o => o.status_pesanan === 'selesai' || o.status_pembayaran === 'dibayar')
          .reduce((acc, curr) => acc + Number(curr.total_harga), 0);

        const itemsSold = monthlyOrders
          .filter(o => o.status_pesanan === 'selesai' || o.status_pembayaran === 'dibayar')
          .reduce((acc, curr) => {
            const orderItemsCount = curr.items?.reduce((itemAcc, item) => itemAcc + item.quantity, 0) || 0;
            return acc + orderItemsCount;
          }, 0);

        // Calculate Best Seller
        const itemCounts: Record<string, number> = {};
        monthlyOrders.forEach((o) => {
          if (o.status_pesanan === 'selesai' || o.status_pembayaran === 'dibayar') {
            o.items?.forEach((i) => {
              const name = i.menu?.nama_menu || 'Unknown';
              itemCounts[name] = (itemCounts[name] || 0) + i.quantity;
            });
          }
        });

        let bestSeller = '-';
        let maxQty = 0;
        Object.entries(itemCounts).forEach(([name, qty]) => {
          if (qty > maxQty) {
            maxQty = qty;
            bestSeller = name;
          }
        });

        // Calculate Daily Revenue for Chart
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailyRevenue = new Array(daysInMonth).fill(0);

        monthlyOrders.forEach((o) => {
          if (o.status_pesanan === 'selesai' || o.status_pembayaran === 'dibayar') {
            const day = new Date(o.tanggal_dibuat || '').getDate();
            dailyRevenue[day - 1] += Number(o.total_harga);
          }
        });

        const chartData = dailyRevenue.map((rev, index) => ({
          day: index + 1,
          revenue: rev,
        }));

        setStats({
          ordersCount: monthlyOrders.length,
          revenue,
          menusCount: menus.length,
          categoriesCount: categories.length,
          itemsSold,
          bestSeller,
          chartData,
        });

      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const statCards = [
    {
      title: 'Total Pendapatan (Bulan Ini)',
      value: formatCurrency(stats.revenue),
      icon: 'fa-wallet',
      color: 'from-emerald-500 to-teal-400',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      title: 'Total Pesanan (Bulan Ini)',
      value: stats.ordersCount,
      icon: 'fa-shopping-bag',
      color: 'from-blue-500 to-indigo-400',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
    {
      title: 'Total Menu',
      value: stats.menusCount,
      icon: 'fa-utensils',
      color: 'from-orange-500 to-amber-400',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
    },
    {
      title: 'Kategori',
      value: stats.categoriesCount,
      icon: 'fa-layer-group',
      color: 'from-purple-500 to-pink-400',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
    },
  ];

  const quickActions = [
    {
      title: 'Kelola Pesanan',
      icon: 'fa-plus',
      href: '/admin/kelolapesanan',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Kelola Menu',
      icon: 'fa-burger',
      href: '/admin/kelolamenu',
      color: 'bg-emerald-600 hover:bg-emerald-700',
    },
    {
      title: 'Kelola Kategori',
      icon: 'fa-tags',
      href: '/admin/kelolakategori',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8 animate-fade-in-down">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-dark">Dashboard Admin</h1>
            <p className="text-gray-500 mt-1">Selamat datang kembali, pantau performa cafe anda hari ini.</p>
          </div>
          <div className="flex gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`${action.color} text-white px-4 py-2 rounded-xl shadow-lg shadow-gray-200 flex items-center gap-2 text-sm font-semibold transition-transform hover:-translate-y-0.5`}
              >
                <i className={`fas ${action.icon}`}></i>
                <span className="hidden sm:inline">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-shadow duration-300 relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
              <div className="relative z-10">
                <div className={`h-12 w-12 rounded-xl ${stat.bg} ${stat.text} flex items-center justify-center text-xl mb-4 shadow-sm`}>
                  <i className={`fas ${stat.icon}`}></i>
                </div>
                <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                <h3 className="text-2xl font-bold text-brand-dark mt-1">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sales Chart (Replaces Recent Orders) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-dark">Statistik Penjualan (Bulan Ini)</h3>
            </div>
            <div className="p-6 flex-1 flex items-end justify-center relative min-h-[300px]">
              {/* Friendly Bar Chart */}
              {stats.chartData.length > 0 ? (
                <div className="w-full h-full relative flex items-end justify-between gap-1">
                  {stats.chartData.map((d, i) => {
                    const maxRev = Math.max(...stats.chartData.map(d => d.revenue)) || 1;
                    const heightPercentage = (d.revenue / maxRev) * 100;

                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          <p className="font-bold">{formatCurrency(d.revenue)}</p>
                          <p className="text-gray-300">Tgl {d.day}</p>
                        </div>

                        {/* Bar */}
                        <div
                          className="w-full bg-brand-accent/20 rounded-t-sm group-hover:bg-brand-accent transition-all duration-300 relative"
                          style={{ height: `${heightPercentage}%` }}
                        >
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-accent/10 to-transparent rounded-t-sm"></div>
                        </div>

                        {/* X-Axis Label (Show every 3rd day or if it's the first/last) */}
                        {(i === 0 || i === stats.chartData.length - 1 || (i + 1) % 3 === 0) && (
                          <div className="text-[10px] text-gray-400 text-center mt-1 absolute top-full left-1/2 -translate-x-1/2">
                            {d.day}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-400 text-sm">Belum ada data penjualan bulan ini.</div>
              )}
            </div>
          </div>

          {/* Performance Widget */}
          <div className="bg-gradient-to-br from-brand-dark to-gray-900 rounded-2xl shadow-lg text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-1">Performa Penjualan</h3>
              <p className="text-brand-accent/80 text-sm mb-6">Ringkasan Bulan Ini</p>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">Menu Terlaris</span>
                    <span className="font-bold text-brand-accent">{stats.bestSeller}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-accent w-full rounded-full opacity-50"></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-xs text-gray-400">Rata-rata Transaksi</p>
                    <p className="text-lg font-bold mt-1">{formatCurrency(stats.ordersCount > 0 ? stats.revenue / stats.ordersCount : 0)}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-xs text-gray-400">Total Produk Terjual</p>
                    <p className="text-lg font-bold mt-1">{stats.itemsSold} <span className="text-xs font-normal text-gray-500">porsi</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
