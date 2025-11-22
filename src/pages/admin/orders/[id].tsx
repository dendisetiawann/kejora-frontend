import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminGet, adminPut } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Order } from '@/types/entities';
import { extractErrorMessage } from '@/lib/errors';

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const orderId = Array.isArray(id) ? id[0] : id;
    adminGet<Order>(`/admin/orders/${orderId}`)
      .then(setOrder)
      .catch(() => setError('Pesanan tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleProcessOrder = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      await adminPut<{ order: Order }>(`/admin/orders/${order.id}/status`, {
        order_status: 'diproses',
      });

      if (order.payment_method === 'cash') {
        await adminPut<{ order: Order }>(`/admin/orders/${order.id}/payment-status`, {
          payment_status: 'dibayar',
        });
      }

      setSuccessMessage('Pesanan sedang diproses!');

      const updatedOrder = await adminGet<Order>(`/admin/orders/${order.id}`);
      setOrder(updatedOrder);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal memproses pesanan.'));
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      await adminPut<{ order: Order }>(`/admin/orders/${order.id}/status`, {
        order_status: 'selesai',
      });
      setSuccessMessage('Pesanan berhasil diselesaikan!');
      setTimeout(() => {
        router.push('/admin/orders?tab=history');
      }, 1500);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal menyelesaikan pesanan.'));
      setUpdating(false);
    }
  };

  return (
    <AdminLayout title={`Detail Pesanan`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-center gap-3 animate-fade-in-down">
            <i className="fas fa-check-circle text-xl"></i>
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {loading && <p className="text-center text-slate-400 py-12">Memuat detail pesanan...</p>}
        {error && <p className="text-center text-red-600 py-12">{error}</p>}

        {order && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-3xl font-bold text-brand-dark">{order.order_number || `#${order.id}`}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${order.order_status === 'selesai' ? 'bg-green-100 text-green-800' :
                        order.order_status === 'diproses' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                      {order.order_status === 'selesai' ? 'Pesanan Selesai' :
                        order.order_status === 'diproses' ? 'Pesanan Diproses' :
                          'Pesanan Baru'}
                    </span>
                  </div>
                  <p className="text-gray-500 flex items-center gap-2">
                    <i className="far fa-clock"></i>
                    {order.created_at ? new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : '-'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Total Pembayaran</p>
                  <p className="text-4xl font-bold text-brand-accent">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pelanggan</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                      <i className="fas fa-user"></i>
                    </div>
                    <div>
                      <p className="font-bold text-brand-dark">{order.customer_name}</p>
                      <p className="text-sm text-gray-500">Meja {order.table_number}</p>
                    </div>
                  </div>
                  {order.customer_note && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 italic">"{order.customer_note}"</p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pembayaran</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w- 10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                      <i className={`fas ${order.payment_method === 'cash' ? 'fa-money-bill-wave' : 'fa-qrcode'}`}></i>
                    </div>
                    <div>
                      <p className="font-bold text-brand-dark uppercase">{order.payment_method}</p>
                      <p className={`text-sm font-medium ${order.payment_status === 'dibayar' ? 'text-green-600' :
                          order.payment_status === 'pending' ? 'text-yellow-600' :
                            'text-red-600'
                        }`}>
                        {order.payment_status === 'dibayar' ? 'Lunas' :
                          order.payment_status === 'pending' ? 'Menunggu Pembayaran' :
                            'Belum Bayar'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl flex flex-col justify-center">
                  {order.order_status === 'baru' && (
                    <button
                      onClick={handleProcessOrder}
                      disabled={updating}
                      className="w-full bg-brand-accent text-brand-dark py-3 rounded-lg font-bold hover:bg-yellow-500 transition-all shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2"
                    >
                      {updating ? (
                        <span className="animate-spin"><i className="fas fa-spinner"></i></span>
                      ) : (
                        <i className="fas fa-play"></i>
                      )}
                      Proses Pesanan
                    </button>
                  )}

                  {order.order_status === 'diproses' && (
                    <button
                      onClick={handleCompleteOrder}
                      disabled={updating}
                      className="w-full bg-brand-dark text-white py-3 rounded-lg font-bold hover:bg-brand-DEFAULT transition-all shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2"
                    >
                      {updating ? (
                        <span className="animate-spin"><i className="fas fa-spinner"></i></span>
                      ) : (
                        <i className="fas fa-check"></i>
                      )}
                      Selesaikan Pesanan
                    </button>
                  )}

                  {order.order_status === 'selesai' && (
                    <div className="text-center text-gray-500 font-medium">
                      <i className="fas fa-check-circle text-green-500 text-2xl mb-2 block"></i>
                      Pesanan Selesai
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-brand-dark">Rincian Pesanan</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium">Menu</th>
                    <th className="text-center px-6 py-3 font-medium">Qty</th>
                    <th className="text-right px-6 py-3 font-medium">Harga Satuan</th>
                    <th className="text-right px-6 py-3 font-medium">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-brand-dark">{item.menu?.name ?? item.menu_id}</p>
                        {item.note && <p className="text-xs text-gray-500 mt-1 italic">Catatan: {item.note}</p>}
                      </td>
                      <td className="px-6 py-4 text-center font-medium">{item.qty}</td>
                      <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="px-6 py-4 text-right font-bold text-brand-accent">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right font-bold text-gray-600">Total</td>
                    <td className="px-6 py-4 text-right font-bold text-brand-dark text-lg">{formatCurrency(order.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
