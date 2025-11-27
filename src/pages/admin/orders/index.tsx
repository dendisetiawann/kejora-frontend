import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useNotification } from '@/contexts/NotificationContext';
import { adminGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Order } from '@/types/entities';

type HistoryFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const { latestOrder, refreshOrders } = useNotification();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await adminGet<Order[]>('/admin/orders');
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh orders when a new global notification arrives
  useEffect(() => {
    if (latestOrder) {
      fetchOrders();
    }
  }, [latestOrder]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'active') {
      return ['baru', 'diproses'].includes(order.order_status) ||
        (order.payment_status === 'pending' && order.order_status !== 'selesai' && order.order_status !== 'batal') ||
        (order.payment_status === 'belum_bayar' && order.order_status !== 'selesai' && order.order_status !== 'batal');
    }

    if (!['selesai', 'batal'].includes(order.order_status)) return false;



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

    if (historyFilter === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate ? new Date(customEndDate) : new Date();
      end.setHours(23, 59, 59, 999); // Include the whole end day
      return orderDate >= start && orderDate <= end;
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

  const totalRevenue = filteredOrders.reduce((acc, order) => {
    if (order.order_status === 'selesai' || order.payment_status === 'dibayar') {
      return acc + Number(order.total_amount);
    }
    return acc;
  }, 0);

  return (
    <AdminLayout title="Kelola Pesanan">


      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-dark">Daftar Pesanan</h2>
            <p className="text-gray-500 text-sm">Pantau pesanan masuk secara real-time.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {activeTab === 'history' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value as HistoryFilter)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                >
                  <option value="today">Hari Ini</option>
                  <option value="week">7 Hari Terakhir</option>
                  <option value="month">Bulan Ini</option>
                  <option value="year">Tahun Ini</option>
                  <option value="custom">Pilih Tanggal</option>
                </select>
                {historyFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                    />
                  </div>
                )}
              </div>
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

        {activeTab === 'history' && (
          <div className="px-6 py-4 bg-brand-accent/5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Pendapatan</p>
              <p className="text-xs text-gray-400 mt-0.5">Berdasarkan filter yang dipilih</p>
            </div>
            <p className="text-2xl font-bold text-brand-dark">{formatCurrency(totalRevenue)}</p>
          </div>
        )}

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
                      <p>Tidak ada pesanan {activeTab === 'active' ? 'aktif' : 'dalam riwayat'} {activeTab === 'history' ? 'untuk periode ini' : ''}.</p>
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
