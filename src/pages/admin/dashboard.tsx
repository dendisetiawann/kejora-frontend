import { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Order } from '@/types/entities';

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<{ key: string; message: string }[]>([]);
  const seenOrderIdsRef = useRef<Set<number>>(new Set());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addNotification = (message: string) => {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setNotifications((prev) => [...prev, { key, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.key !== key));
    }, 5000);
  };

  const fetchOrders = async (showPopup = false) => {
    try {
      const data = await adminGet<Order[]>('/admin/orders');
      setOrders(data);

      const seenIds = seenOrderIdsRef.current;
      const newOrders = data.filter((order) => order.order_status === 'baru' && !seenIds.has(order.id));
      data.forEach((order) => seenIds.add(order.id));

      if (showPopup && newOrders.length > 0) {
        newOrders.forEach((order) => {
          const message = `Pesanan baru atas nama ${order.customer_name} (Meja ${order.table_number})`;
          addNotification(message);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(false);

    pollIntervalRef.current = setInterval(() => {
      fetchOrders(true);
    }, 7000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const newOrders = orders.filter((order) => order.order_status === 'baru').length;
    const processingOrders = orders.filter((order) => order.order_status === 'diproses').length;
    const pendingPayments = orders.filter((order) =>
      ['belum_bayar', 'pending'].includes(order.payment_status)
    ).length;
    const revenue = orders
      .filter((order) => order.payment_status === 'dibayar')
      .reduce((sum, order) => sum + order.total_amount, 0);

    return { totalOrders, newOrders, processingOrders, pendingPayments, revenue };
  }, [orders]);

  const latestOrders = useMemo(() => orders.slice(0, 5), [orders]);

  return (
    <AdminLayout title="Dashboard">
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.key}
              className="rounded-2xl bg-white shadow-lg border border-brand-accent/30 px-5 py-4 text-sm text-brand-dark w-64"
            >
              <p className="font-semibold text-brand-accent mb-1">Pesanan Baru</p>
              <p>{notification.message}</p>
            </div>
          ))}
        </div>
      )}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-slate-500">Total Pesanan</p>
          <p className="text-3xl font-bold text-brand-dark mt-2">{stats.totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-slate-500">Pesanan Baru</p>
          <p className="text-3xl font-bold text-brand-dark mt-2">{stats.newOrders}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-slate-500">Sedang Diproses</p>
          <p className="text-3xl font-bold text-brand-dark mt-2">{stats.processingOrders}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-slate-500">Pembayaran Pending</p>
          <p className="text-3xl font-bold text-brand-dark mt-2">{stats.pendingPayments}</p>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-dark">Ringkasan Pendapatan</h2>
          <span className="text-2xl font-bold text-brand-accent">{formatCurrency(stats.revenue)}</span>
        </div>
        <p className="text-sm text-slate-500">Total pembayaran berhasil (status dibayar).</p>
      </section>

      <section className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-dark">Pesanan Terbaru</h2>
          {loading && <span className="text-sm text-slate-400">Memuat...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2">ID</th>
                <th>Nama</th>
                <th>Meja</th>
                <th>Total</th>
                <th>Status</th>
                <th>Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {latestOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="py-2 font-semibold text-brand-dark">{order.id}</td>
                  <td>{order.customer_name}</td>
                  <td>{order.table_number}</td>
                  <td className="font-semibold text-brand-accent">{formatCurrency(order.total_amount)}</td>
                  <td>{order.order_status}</td>
                  <td>{order.payment_status}</td>
                </tr>
              ))}
              {!loading && latestOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-slate-500">
                    Belum ada pesanan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}

