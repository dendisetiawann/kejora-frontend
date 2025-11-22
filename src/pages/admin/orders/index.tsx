import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Order } from '@/types/entities';

type HistoryFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('today');
  const [notification, setNotification] = useState<string | null>(null);
  const previousOrdersRef = useRef<Order[]>([]);

  const fetchOrders = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const data = await adminGet<Order[]>('/admin/orders');

      // Check for new orders
      if (isPolling && previousOrdersRef.current.length > 0) {
        const newOrders = data.filter(
          (o) => !previousOrdersRef.current.find((prev) => prev.id === o.id) && o.order_status === 'baru'
        );
        if (newOrders.length > 0) {
          setNotification(`Pesanan baru diterima! (${newOrders.length} pesanan)`);
          setTimeout(() => setNotification(null), 5000);
        }
      }

      previousOrdersRef.current = data;
      setOrders(data);
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'active') {
      return ['baru', 'diproses'].includes(order.order_status) ||
        (order.payment_status === 'pending' && order.order_status !== 'selesai' && order.order_status !== 'batal') ||
        (order.payment_status === 'belum_bayar' && order.order_status !== 'selesai' && order.order_status !== 'batal');
    }

    if (!['selesai', 'batal'].includes(order.order_status)) return false;

    if (historyFilter === 'all') return true;

    const orderDate = new Date(order.created_at ?? 0);
    const now = new Date();

    if (historyFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }

    if (historyFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return orderDate >= oneWeekAgo;
    }

    if (historyFilter === 'month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }

    if (historyFilter === 'year') {
      return orderDate.getFullYear() === now.getFullYear();
    }

    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at ?? 0).getTime();
    const dateB = new Date(b.created_at ?? 0).getTime();

    if (activeTab === 'active') {
      return dateA - dateB;
    }
    return dateB - dateA;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = (order: Order) => {
    if (order.order_status === 'selesai') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">Pesanan Selesai</span>;
    }

    if (order.payment_method === 'cash' && order.payment_status === 'belum_bayar') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">Pesanan Belum Dibayar</span>;
    }

    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 whitespace-nowrap">Pesanan Diproses</span>;
  };

  return (
    <AdminLayout title="Kelola Pesanan">
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in-down">
          <div className="bg-brand-dark text-white px-6 py-4 rounded-xl shadow-xl border border-brand-accent/30 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-accent flex items-center justify-center text-brand-dark">
              <i className="fas fa-bell"></i>
            </div>
            <div>
              <p className="font-bold text-brand-accent">Notifikasi</p>
              <p className="text-sm">{notification}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-dark">Daftar Pesanan</h2>
            <p className="text-gray-500 text-sm">Pantau pesanan masuk secara real-time.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {activeTab === 'history' && (
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as HistoryFilter)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
              >
                <option value="today">Hari Ini</option>
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
                <option value="year">Tahun Ini</option>
                <option value="all">Semua Waktu</option>
              </select>
            )}

            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'active'
                    ? 'bg-white text-brand-dark shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Pesanan Aktif
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history'
                    ? 'bg-white text-brand-dark shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Riwayat Pesanan
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/50">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">No. Pesanan</th>
                <th className="px-6 py-4 font-medium">Nama Pelanggan</th>
                <th className="px-6 py-4 font-medium">Waktu Pemesanan</th>
                <th className="px-6 py-4 font-medium">Nomor Meja</th>
                <th className="px-6 py-4 font-medium">Total Pembayaran</th>
                <th className="px-6 py-4 font-medium">Metode Pembayaran</th>
                <th className="px-6 py-4 font-medium">Status Pesanan</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-brand-dark">{order.order_number || `#${order.id}`}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{order.customer_name}</td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {order.table_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-brand-accent">{formatCurrency(order.total_amount)}</td>
                  <td className="px-6 py-4 text-gray-600 uppercase text-xs font-bold tracking-wider">{order.payment_method}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-brand-accent text-brand-accent rounded-lg text-xs font-bold hover:bg-brand-accent hover:text-brand-dark transition-colors"
                    >
                      Lihat Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <i className="fas fa-clipboard-list text-4xl mb-3 opacity-20"></i>
                      <p>Tidak ada pesanan {activeTab === 'active' ? 'aktif' : 'dalam riwayat'} {activeTab === 'history' && historyFilter !== 'all' ? 'untuk periode ini' : ''}.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
