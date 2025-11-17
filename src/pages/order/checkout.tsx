import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Order } from '@/types/entities';
import { publicPost } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { extractErrorMessage } from '@/lib/errors';
import { CheckoutDraft, clearCheckoutDraft, readCheckoutDraft, saveCheckoutDraft } from '@/lib/checkoutDraft';
import { saveOrderSuccess } from '@/lib/orderSuccess';

type PaymentMethod = 'cash' | 'qris';

type OrderResponse = {
  message: string;
  order: Order;
  snap_token?: string | null;
};

export default function OrderCheckoutPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerNote, setCustomerNote] = useState('');

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const orderTime = draft ? new Date(draft.createdAt) : null;

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
          note: item.note,
        })),
      };

      const response = await publicPost<OrderResponse>('/public/orders', payload);
      clearCheckoutDraft();
      const createdAt = response.order.created_at ?? new Date().toISOString();
      saveOrderSuccess({
        orderId: response.order.id,
        orderCode: response.order.midtrans_order_id ?? `ORD-${response.order.id}`,
        customerName: draft.customerName,
        tableNumber: draft.tableNumber,
        paymentMethod,
        total,
        items: draft.items,
        customerNote: customerNote.trim() ? customerNote.trim() : null,
        snapToken: response.snap_token ?? null,
        message: response.message,
        createdAt,
        paymentStatus: response.order.payment_status,
        orderStatus: response.order.order_status,
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
        <p className="text-sm text-slate-500">Menyiapkan ringkasan pesanan...</p>
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
          className="px-4 py-2 rounded-full bg-brand-accent text-white"
        >
          Kembali ke menu
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Ringkasan Pesanan - KejoraCash</title>
      </Head>
      <div className="min-h-screen bg-brand-light/40 pb-20">
        <header className="bg-white/90 shadow-sm border-b border-brand-light/60">
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-2">
            <p className="text-xs uppercase tracking-[0.5em] text-brand-accent">Konfirmasi Pesanan</p>
            <h1 className="text-3xl font-bold text-brand-dark">Cek kembali sebelum pesan</h1>
            <p className="text-sm text-brand-dark/70">
              Pastikan item, jumlah, dan metode pembayaran sudah sesuai. Kamu masih bisa menambahkan menu jika perlu.
            </p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <section className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(31,61,43,0.07)] border border-brand-light/60 p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Informasi pelanggan</p>
              <h2 className="text-2xl font-semibold text-brand-dark">{draft.customerName}</h2>
              <p className="text-sm text-brand-dark/70">Nomor meja {draft.tableNumber}</p>
              {orderTime && (
                <p className="text-xs text-brand-dark/50">
                  Dibuat {orderTime.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-brand-light/50 px-4 py-3 text-sm text-brand-dark/80">
              Total item <span className="font-semibold text-brand-dark">{draft.items.length}</span>
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(31,61,43,0.07)] border border-brand-light/60 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Detail pesanan</p>
                <h2 className="text-xl font-semibold text-brand-dark">Ringkasan menu</h2>
              </div>
              <span className="text-sm text-brand-dark/70">Subtotal: {formatCurrency(total)}</span>
            </div>
            <div className="space-y-4">
              {draft.items.map((item) => (
                <div key={item.menu_id} className="flex items-start justify-between gap-4 border-b border-brand-light/50 pb-4">
                  <div>
                    <p className="font-semibold text-brand-dark">{item.name}</p>
                    <p className="text-xs text-brand-dark/60">{item.qty} x {formatCurrency(item.price)}</p>
                    {item.note && <p className="text-xs text-brand-accent mt-1">Catatan: {item.note}</p>}
                  </div>
                  <p className="font-semibold text-brand-accent">{formatCurrency(item.price * item.qty)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-brand-dark/70">Total pembayaran</span>
              <span className="text-2xl font-semibold text-brand-dark">{formatCurrency(total)}</span>
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(31,61,43,0.07)] border border-brand-light/60 p-6 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Catatan untuk cafe</p>
                <p className="text-sm text-brand-dark/70">Tambahkan permintaan khusus (opsional).</p>
                <textarea
                  value={customerNote}
                  onChange={(event) => handleNoteChange(event.target.value)}
                  placeholder="Contoh: Tolong buatkan tanpa gula, atau kirimkan dulu minuman panas."
                  className="w-full min-h-[120px] rounded-2xl border border-brand-light/70 px-4 py-3 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.4em] text-brand-accent">Metode pembayaran</p>
                <div className="grid grid-cols-1 gap-3">
                  {(['cash', 'qris'] as PaymentMethod[]).map((method) => (
                    <label
                      key={method}
                      className={`rounded-2xl border px-4 py-4 cursor-pointer transition ${
                        paymentMethod === method
                          ? 'border-brand-accent bg-brand-accent/10 text-brand-accent font-semibold shadow'
                          : 'border-brand-light/70 text-brand-dark/70 hover:border-brand-accent/60'
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
                      <div className="flex items-center justify-between text-sm">
                        <span>{method === 'cash' ? 'Tunai di kasir' : 'QRIS'}</span>
                        <i className={`fas ${method === 'cash' ? 'fa-wallet' : 'fa-qrcode'} text-base`}></i>
                      </div>
                      <p className="text-xs text-brand-dark/60 mt-1">
                        {method === 'cash'
                          ? 'Bayar langsung di kasir setelah pesanan dibuat.'
                          : 'Scan QRIS setelah pesanan dikirim ke kasir.'}
                      </p>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">{error}</div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleBackToMenu}
                className="px-5 py-3 rounded-2xl border border-brand-dark/40 text-brand-dark font-semibold hover:bg-brand-dark hover:text-white transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white font-semibold py-3 rounded-2xl shadow disabled:opacity-70"
              >
                {submitting ? 'Memproses...' : 'Pesan Sekarang'}
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
