import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminGet, adminPut } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Pesanan } from '@/types/entities';
import { extractErrorMessage } from '@/lib/errors';

export default function HalamanDetailPesanan() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState<Pesanan | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const catatanPelanggan = order?.catatan_pelanggan ?? order?.pelanggan?.catatan_pelanggan ?? '';
  const hasCatatan = Boolean(catatanPelanggan?.trim());

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!router.isReady) return;
    if (!id) {
      setError('ID pesanan tidak ditemukan.');
      setLoading(false);
      return;
    }
    const orderId = Array.isArray(id) ? id[0] : id;
    adminGet<Pesanan>(`/admin/kelolapesanan/${orderId}`)
      .then(setOrder)
      .catch(() => setError('Pesanan tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [router.isReady, id]);

  const handleProcessOrder = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      await adminPut<{ order: Pesanan }>(`/admin/kelolapesanan/${order.id_pesanan}/status`, {
        status_pesanan: 'diproses',
      });

      if (order.metode_pembayaran === 'cash') {
        await adminPut<{ order: Pesanan }>(`/admin/kelolapesanan/${order.id_pesanan}/payment-status`, {
          status_pembayaran: 'dibayar',
        });
      }

      setSuccessMessage('Pesanan sedang diproses!');

      const updatedOrder = await adminGet<Pesanan>(`/admin/kelolapesanan/${order.id_pesanan}`);
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
      await adminPut<{ order: Pesanan }>(`/admin/kelolapesanan/${order.id_pesanan}/status`, {
        status_pesanan: 'selesai',
      });
      setSuccessMessage('Pesanan berhasil diselesaikan!');
      setTimeout(() => {
        router.push('/admin/HalamanDaftarPesanan?tab=history');
      }, 1500);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal menyelesaikan pesanan.'));
      setUpdating(false);
    }
  };

  function tampilNotifikasiPesanan() {
    if (!successMessage) return null;

    return (
      <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl flex items-center gap-3 animate-fade-in-down">
        <i className="fas fa-check-circle text-xl"></i>
        <p className="font-medium">{successMessage}</p>
      </div>
    );
  }

  function tampilHalamanDetailPesanan() {
    return (
      <AdminLayout title={`Detail Pesanan`}>
        <div className="max-w-4xl mx-auto space-y-6">
          {tampilNotifikasiPesanan()}

          {loading && <p className="text-center text-slate-400 py-12">Memuat detail pesanan...</p>}
          {error && <p className="text-center text-red-600 py-12">{error}</p>}

          {order && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-3xl font-bold text-brand-dark">{order.nomor_pesanan || `#${order.id_pesanan}`}</h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          order.status_pesanan === 'selesai'
                            ? 'bg-green-100 text-green-800'
                            : order.status_pesanan === 'diproses'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.status_pesanan === 'selesai'
                          ? 'Pesanan Selesai'
                          : order.status_pesanan === 'diproses'
                          ? 'Pesanan Diproses'
                          : 'Pesanan Baru'}
                      </span>
                    </div>
                    <p className="text-gray-500 flex items-center gap-2">
                      <i className="far fa-clock"></i>
                      {order.tanggal_dibuat
                        ? new Date(order.tanggal_dibuat).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
                        : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Total Pembayaran</p>
                    <p className="text-4xl font-bold text-brand-accent">{formatCurrency(order.total_harga)}</p>
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
                        <p className="font-bold text-brand-dark">{order.nama_pelanggan || order.pelanggan?.nama_pelanggan || '-'}</p>
                        <p className="text-sm text-gray-500">Meja {order.nomor_meja || order.pelanggan?.nomor_meja || '-'}</p>
                      </div>
                    </div>
                    {!hasCatatan && (
                      <p className="mt-3 text-xs text-gray-400 italic">Tidak ada catatan dari pelanggan.</p>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pembayaran</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                        <i className={`fas ${order.metode_pembayaran === 'cash' ? 'fa-money-bill-wave' : 'fa-qrcode'}`}></i>
                      </div>
                      <div>
                        <p className="font-bold text-brand-dark uppercase">{order.metode_pembayaran}</p>
                        <p
                          className={`text-sm font-medium ${
                            order.status_pembayaran === 'dibayar'
                              ? 'text-green-600'
                              : order.status_pembayaran === 'pending'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {order.status_pembayaran === 'dibayar'
                            ? 'Lunas'
                            : order.status_pembayaran === 'pending'
                            ? 'Menunggu Pembayaran'
                            : 'Belum Bayar'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl flex flex-col justify-center">
                    {order.status_pesanan === 'baru' && (
                      <button
                        onClick={handleProcessOrder}
                        disabled={updating}
                        className="w-full bg-brand-accent text-brand-dark py-3 rounded-lg font-bold shadow-lg shadow-brand-accent/20 flex items-center justify-center gap-2"
                      >
                        {updating ? (
                          <span className="animate-spin">
                            <i className="fas fa-spinner"></i>
                          </span>
                        ) : (
                          <i className="fas fa-play"></i>
                        )}
                        Proses Pesanan
                      </button>
                    )}

                    {order.status_pesanan === 'diproses' && (
                      <button
                        onClick={handleCompleteOrder}
                        disabled={updating}
                        className="w-full bg-brand-dark text-white py-3 rounded-lg font-bold shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2"
                      >
                        {updating ? (
                          <span className="animate-spin">
                            <i className="fas fa-spinner"></i>
                          </span>
                        ) : (
                          <i className="fas fa-check"></i>
                        )}
                        Selesaikan Pesanan
                      </button>
                    )}

                    {order.status_pesanan === 'selesai' && (
                      <div className="text-center text-gray-500 font-medium">
                        <i className="fas fa-check-circle text-green-500 text-2xl mb-2 block"></i>
                        Pesanan Selesai
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {hasCatatan && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Catatan Pelanggan</p>
                    </div>
                    <span className="h-10 w-10 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                      <i className="fas fa-comment-dots"></i>
                    </span>
                  </div>
                  <p className="text-base leading-relaxed text-gray-700 bg-brand-light/30 rounded-2xl p-4 border border-brand-light/60">
                    {catatanPelanggan}
                  </p>
                </div>
              )}

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
                      <tr key={item.id_itempesanan}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-brand-dark">{item.menu?.nama_menu ?? item.id_menu}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(item.harga_itempesanan)}</td>
                        <td className="px-6 py-4 text-right font-bold text-brand-accent">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-right font-bold text-gray-600">
                        Total
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-brand-dark text-lg">
                        {formatCurrency(order.total_harga)}
                      </td>
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

  return tampilHalamanDetailPesanan();
}
