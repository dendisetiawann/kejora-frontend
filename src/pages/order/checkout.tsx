import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Pesanan } from '@/types/entities';
import { publicPost } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { extractErrorMessage } from '@/lib/errors';
import { CheckoutDraft, clearCheckoutDraft, readCheckoutDraft, saveCheckoutDraft } from '@/lib/checkoutDraft';
import { saveOrderSuccess } from '@/lib/orderSuccess';

type PaymentMethod = 'cash' | 'qris';

type OrderResponse = {
  message: string;
  order: Pesanan;
  snap_token?: string | null;
};

export default function OrderCheckoutPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      return;
    }
    if (draft.paymentMethod) {
      setPaymentMethod(draft.paymentMethod);
    }
    if (typeof draft.orderNote === 'string') {
      setCustomerNote(draft.orderNote);
    }
  }, [draft]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = readCheckoutDraft();
    if (!stored || stored.items.length === 0) {
      setDraft(null);
      setDraftChecked(true);
      router.replace('/order');
      return;
    }
    setDraft(stored);
    setDraftChecked(true);
  }, [router]);

  const persistDraft = (updates: Partial<CheckoutDraft>) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }
      const nextDraft: CheckoutDraft = {
        ...prev,
        ...updates,
      };
      saveCheckoutDraft(nextDraft);
      return nextDraft;
    });
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    persistDraft({ paymentMethod: method });
  };

  const handleNoteChange = (value: string) => {
    setCustomerNote(value);
    persistDraft({ orderNote: value });
  };

  const handleBackToMenu = () => {
    persistDraft({ paymentMethod, orderNote: customerNote });
    router.push('/order');
  };

  const total = useMemo(() => {
    if (!draft) {
      return 0;
    }
    return draft.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [draft]);

  const handleSubmit = async () => {
    if (!draft) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        customer_name: draft.customerName,
        table_number: draft.tableNumber,
        payment_method: paymentMethod,
        customer_note: customerNote.trim() ? customerNote.trim() : null,
        items: draft.items.map((item) => ({
          menu_id: item.menu_id,
          qty: item.qty,
        })),
      };

      const response = await publicPost<OrderResponse>('/public/orders', payload);
      clearCheckoutDraft();
      const createdAt = response.order.tanggal_dibuat ?? new Date().toISOString();
      saveOrderSuccess({
        orderId: response.order.id_pesanan,
        orderCode: response.order.nomor_pesanan || response.order.id_transaksi_qris || `ORD-${response.order.id_pesanan}`,
        customerName: draft.customerName,
        tableNumber: draft.tableNumber,
        paymentMethod,
        total,
        items: draft.items,
        customerNote: customerNote.trim() ? customerNote.trim() : null,
        snapToken: response.snap_token ?? null,
        message: response.message,
        createdAt,
        paymentStatus: response.order.status_pembayaran,
        orderStatus: response.order.status_pesanan,
      });

      router.replace('/order/success');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal membuat pesanan.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!draftChecked) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-500">Keranjang kosong. Kamu akan diarahkan ke halaman order.</p>
        <button
          type="button"
          onClick={() => router.replace('/order')}
          className="px-6 py-2 rounded-full bg-brand-accent text-white font-medium hover:bg-brand-dark transition-colors"
        >
          Kembali ke menu
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout - KejoraCash</title>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
          rel="stylesheet"
        />
      </Head>
      <div className="min-h-screen bg-brand-light/40 pb-20 font-sans">
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBackToMenu} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
                <i className="fas fa-arrow-left text-brand-dark"></i>
              </button>
              <h1 className="text-lg font-bold text-brand-dark tracking-tight">Konfirmasi Pesanan</h1>
            </div>
            <div className="text-xs font-medium px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
              Meja {draft.tableNumber}
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

          {/* Customer Card */}
          <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-dark to-gray-800 flex items-center justify-center text-white shadow-md">
                <i className="fas fa-user text-lg"></i>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-1">Pemesan</p>
                <h2 className="text-xl font-bold text-brand-dark">{draft.customerName}</h2>
              </div>
            </div>
          </section>

          {/* Order Summary */}
          <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <i className="fas fa-receipt text-brand-accent"></i> Ringkasan Menu
              </h3>
              <span className="text-sm font-medium text-gray-500">{draft.items.length} Item</span>
            </div>

            <div className="space-y-4">
              {draft.items.map((item) => (
                <div key={item.menu_id} className="flex items-start justify-between group">
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="font-bold text-brand-dark text-base group-hover:text-brand-accent transition-colors">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span className="font-medium text-brand-dark">{item.qty}x</span>
                      <span>{formatCurrency(item.price)}</span>
                    </div>
                    {item.note && (
                      <div className="mt-1 flex items-start gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg inline-block">
                        <i className="fas fa-pen mt-0.5"></i> {item.note}
                      </div>
                    )}
                  </div>
                  <p className="font-bold text-brand-dark">{formatCurrency(item.price * item.qty)}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Total Pembayaran</span>
                <span className="text-2xl font-extrabold text-brand-dark">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </section>

          {/* Preferences & Payment */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Note */}
            <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50 flex flex-col">
              <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fas fa-comment-alt text-gray-400"></i> Catatan
              </h3>
              <textarea
                value={customerNote}
                onChange={(event) => handleNoteChange(event.target.value)}
                placeholder="Contoh: Jangan terlalu manis, es dipisah..."
                className="w-full flex-1 min-h-[100px] rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:bg-white transition-all resize-none"
              />
            </section>

            {/* Payment Method */}
            <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50">
              <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4 flex items-center gap-2">
                <i className="fas fa-wallet text-gray-400"></i> Pembayaran
              </h3>
              <div className="space-y-3">
                {(['cash', 'qris'] as PaymentMethod[]).map((method) => (
                  <label
                    key={method}
                    className={`relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${paymentMethod === method
                      ? 'border-brand-accent bg-brand-accent/5 shadow-md'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => handlePaymentSelect(method)}
                      className="hidden"
                    />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${paymentMethod === method ? 'bg-brand-accent text-white' : 'bg-white text-gray-400'
                      }`}>
                      <i className={`fas ${method === 'cash' ? 'fa-money-bill-wave' : 'fa-qrcode'}`}></i>
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${paymentMethod === method ? 'text-brand-dark' : 'text-gray-600'}`}>
                        {method === 'cash' ? 'Tunai' : 'QRIS'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {method === 'cash' ? 'Bayar di kasir' : 'Scan kode QR'}
                      </p>
                    </div>
                    {paymentMethod === method && (
                      <div className="absolute top-1/2 right-4 -translate-y-1/2 text-brand-accent">
                        <i className="fas fa-check-circle text-xl"></i>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </section>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2 animate-pulse">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleBackToMenu}
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-brand-dark to-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-dark/20 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Memproses Pesanan...</span>
                </>
              ) : (
                <>
                  <span>Pesan Sekarang</span>
                </>
              )}
            </button>
          </div>

        </main>
      </div>
    </>
  );
}
