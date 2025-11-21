import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminGet, adminPut } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Order } from '@/types/entities';
import { extractErrorMessage } from '@/lib/errors';

const orderStatusOptions: Order['order_status'][] = ['baru', 'diproses', 'selesai'];
const paymentStatusOptions: Order['payment_status'][] = ['belum_bayar', 'pending', 'dibayar', 'gagal'];

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const orderId = Array.isArray(id) ? id[0] : id;
    adminGet<Order>(`/admin/orders/${orderId}`)
      .then(setOrder)
      .catch(() => setError('Pesanan tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleOrderStatusChange = async (status: Order['order_status']) => {
    if (!order) return;
    setUpdating(true);
    try {
      const response = await adminPut<{ order: Order }>(`/admin/orders/${order.id}/status`, {
        order_status: status,
      });
      setOrder(response.order);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal memperbarui status pesanan.'));
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentStatusChange = async (status: Order['payment_status']) => {
    if (!order) return;
    setUpdating(true);
    try {
      const response = await adminPut<{ order: Order }>(`/admin/orders/${order.id}/payment-status`, {
        payment_status: status,
      });
      setOrder(response.order);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal memperbarui status pembayaran.'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AdminLayout title={`Detail Pesanan #${Array.isArray(id) ? id[0] : id ?? ''}`}>
      <div className="bg-white rounded-2xl shadow p-6 space-y-6">
        {loading && <p className="text-sm text-slate-400">Memuat detail pesanan...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {order && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">ID Pesanan</p>
                <h2 className="text-2xl font-bold text-brand-dark">#{order.id}</h2>
                <p className="text-sm text-slate-500">
                  Dibuat {order.created_at ? new Date(order.created_at).toLocaleString('id-ID') : '-'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Total Pembayaran</p>
                <p className="text-3xl font-semibold text-brand-accent">{formatCurrency(order.total_amount)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs uppercase text-slate-400">Pelanggan</p>
                <p className="text-lg font-semibold text-brand-dark mt-1">{order.customer_name}</p>
                <p className="text-sm text-slate-500">Meja {order.table_number}</p>
                {order.customer_note && (
                  <p className="text-xs text-slate-500 mt-2">
                    Catatan: <span className="italic">{order.customer_note}</span>
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs uppercase text-slate-400">Metode Bayar</p>
                <p className="text-lg font-semibold text-brand-dark mt-1">{order.payment_method.toUpperCase()}</p>
                <p className="text-sm text-slate-500">Status: {order.payment_status}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-xs uppercase text-slate-400">Status Pesanan</p>
                <p className="text-lg font-semibold text-brand-dark mt-1">{order.order_status}</p>
                <p className="text-sm text-slate-500">
                  Terakhir diperbarui {order.updated_at ? new Date(order.updated_at).toLocaleString('id-ID') : '-'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2">Menu</th>
                    <th className="text-left px-4 py-2">Qty</th>
                    <th className="text-left px-4 py-2">Harga</th>
                    <th className="text-left px-4 py-2">Subtotal</th>
                    <th className="text-left px-4 py-2">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-semibold text-brand-dark">{item.menu?.name ?? item.menu_id}</td>
                      <td className="px-4 py-2">{item.qty}</td>
                      <td className="px-4 py-2">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 font-semibold text-brand-accent">{formatCurrency(item.subtotal)}</td>
                      <td className="px-4 py-2 text-slate-500">{item.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Ubah Status Pesanan</p>
                <div className="flex flex-wrap gap-2">
                  {orderStatusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleOrderStatusChange(status)}
                      disabled={updating}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                        order.order_status === status
                          ? 'bg-brand-accent text-white border-brand-accent'
                          : 'border-slate-200 text-slate-600 hover:border-brand-accent'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {order.payment_method === 'cash' && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">Ubah Status Pembayaran (Tunai)</p>
                  <div className="flex flex-wrap gap-2">
                    {paymentStatusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handlePaymentStatusChange(status)}
                        disabled={updating}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                          order.payment_status === status
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'border-slate-200 text-slate-600 hover:border-brand-dark'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

