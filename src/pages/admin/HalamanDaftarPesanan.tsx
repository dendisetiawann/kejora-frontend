import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useNotification } from '@/contexts/NotificationContext';
import { adminGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Pesanan } from '@/types/entities';

type HistoryFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function HalamanDaftarPesanan() {
  const [orders, setOrders] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const { latestOrder } = useNotification();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<Pesanan[]>('/admin/kelolapesanan');
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (latestOrder) {
      fetchOrders();
    }
  }, [latestOrder, fetchOrders]);

  const filteredOrders = orders
    .filter((order) => {
      if (activeTab === 'active') {
        return (
          ['baru', 'diproses'].includes(order.status_pesanan) ||
          (order.status_pembayaran === 'pending' && order.status_pesanan !== 'selesai' && order.status_pesanan !== 'batal') ||
          (order.status_pembayaran === 'belum_bayar' && order.status_pesanan !== 'selesai' && order.status_pesanan !== 'batal')
        );
      }

      if (!['selesai', 'batal'].includes(order.status_pesanan)) return false;

      const orderDate = new Date(order.tanggal_dibuat ?? 0);
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
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.tanggal_dibuat ?? 0).getTime();
      const dateB = new Date(b.tanggal_dibuat ?? 0).getTime();

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
      year: 'numeric',
    });
  };

  const getStatusBadge = (order: Pesanan) => {
    if (order.status_pesanan === 'selesai') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
          Pesanan Selesai
        </span>
      );
    }

    if (order.metode_pembayaran === 'cash' && order.status_pembayaran === 'belum_bayar') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
          Pesanan Belum Dibayar
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 whitespace-nowrap">
        Pesanan Diproses
      </span>
    );
  };

  const totalRevenue = filteredOrders.reduce((acc, order) => {
    if (order.status_pesanan === 'selesai' || order.status_pembayaran === 'dibayar') {
      return acc + Number(order.total_harga);
    }
    return acc;
  }, 0);

  const tampilHalamanDaftarPesanan = () => (
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
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'active' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pesanan Aktif
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'history' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                <tr key={order.id_pesanan} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-brand-dark">{order.nomor_pesanan || `#${order.id_pesanan}`}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{order.nama_pelanggan || order.pelanggan?.nama_pelanggan || '-'}</td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(order.tanggal_dibuat)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {order.nomor_meja || order.pelanggan?.nomor_meja || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-brand-accent">{formatCurrency(order.total_harga)}</td>
                  <td className="px-6 py-4 text-gray-600 uppercase text-xs font-bold tracking-wider">{order.metode_pembayaran}</td>
                  <td className="px-6 py-4">{getStatusBadge(order)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={{
                        pathname: '/admin/kelolapesanan/HalamanDetailPesanan',
                        query: { id: order.id_pesanan },
                      }}
                      className="inline-flex items-center px-4 py-2 rounded-xl border border-brand-accent text-brand-accent text-xs font-bold"
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
                      <p>
                        Tidak ada pesanan {activeTab === 'active' ? 'aktif' : 'dalam riwayat'}{' '}
                        {activeTab === 'history' ? 'untuk periode ini' : ''}.
                      </p>
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

  return tampilHalamanDaftarPesanan();
}
