import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Pesanan } from '@/types/entities';
import { publicPost } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { extractErrorMessage } from '@/lib/errors';
import { CheckoutDraft, clearCheckoutDraft, readCheckoutDraft, saveCheckoutDraft } from '@/lib/checkoutDraft';
import { saveOrderSuccess } from '@/lib/orderSuccess';
import HalamanKonfirmasiPembayaran, { PaymentMethod } from './HalamanKonfirmasiPembayaran';

type OrderResponse = {
  message: string;
  order: Pesanan;
  snap_token?: string | null;
};

export default function HalamanKonfirmasiPesanan() {
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
        orderCode: response.order.nomor_pesanan || response.order.id_transaksi_qris || 'ORD-' + response.order.id_pesanan,
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

  const tampilHalamanRingkasanPesanan = () => (
    <>
      <Head>
        <title>Checkout - KejoraCash</title>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
          rel="stylesheet"
        />
      </Head>
      <div className="min-h-screen bg-brand-light/40 pb-20 font-sans">
        <header className="sticky top-0 z-20 backdrop-blur-md bg-white/70 border-b border-white/20 shadow-sm">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-brand-dark tracking-tight">Konfirmasi Pesanan</h1>
            <div className="text-xs font-medium px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
              Meja {draft.tableNumber}
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
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

          <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <i className="fas fa-receipt text-brand-accent"></i> Ringkasan Menu
              </h3>
              <span className="text-sm font-medium text-gray-500">{draft.items.length} Item</span>
            </div>

            <div className="space-y-4">
              {draft.items.map((item) => (
                <div key={item.menu_id} className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-brand-dark text-base">{item.name}</p>
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
                <span className="text-2xl font-extrabold text-brand-dark">{formatCurrency(total)}</span>
              </div>
            </div>
          </section>

          <HalamanKonfirmasiPembayaran
            paymentMethod={paymentMethod}
            onPaymentSelect={handlePaymentSelect}
            customerNote={customerNote}
            onNoteChange={handleNoteChange}
            error={error}
            submitting={submitting}
            onBack={handleBackToMenu}
            onSubmit={handleSubmit}
          />
        </main>
      </div>
    </>
  );

  return tampilHalamanRingkasanPesanan();
}
