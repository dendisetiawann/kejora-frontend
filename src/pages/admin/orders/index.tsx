import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Order } from '@/types/entities';

const statusOptions = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Baru', value: 'baru' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? undefined : { order_status: filter };
      const data = await adminGet<Order[]>('/admin/orders', params);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <AdminLayout title="Daftar Pesanan">
      <div className="bg-white rounded-2xl shadow p-6 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark">Semua Pesanan</h2>
            <p className="text-sm text-slate-500">Kelola status dan pembayaran pesanan.</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-3">ID</th>
                <th>Nama</th>
                <th>Meja</th>
                <th>Catatan</th>
                <th>Total</th>
                <th>Metode</th>
                <th>Status Bayar</th>
                <th>Status Pesanan</th>
                <th>Waktu</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-50">
                  <td className="py-3 font-semibold text-brand-dark">{order.id}</td>
                  <td>{order.customer_name}</td>
                  <td>{order.table_number}</td>
                  <td className="max-w-[200px] text-slate-500">{order.customer_note ?? '-'}</td>
                  <td className="font-semibold text-brand-accent">{formatCurrency(order.total_amount)}</td>
                  <td>{order.payment_method.toUpperCase()}</td>
                  <td>{order.payment_status}</td>
                  <td>{order.order_status}</td>
                  <td>{order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'}</td>
                  <td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-brand-accent font-semibold hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-500">
                    Belum ada pesanan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && <p className="text-center text-sm text-slate-400">Memuat pesanan...</p>}
      </div>
    </AdminLayout>
  );
}

