/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { clearOrderSuccess, OrderSuccessPayload, readOrderSuccess } from '@/lib/orderSuccess';
import { publicGet, publicPost } from '@/lib/api';
import { Order } from '@/types/entities';

const MERCHANT_ID = process.env.NEXT_PUBLIC_QRIS_MERCHANT_ID ?? '9988123';

export default function OrderSuccessPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<OrderSuccessPayload | null>(null);
  const [checked, setChecked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gatewayOpened, setGatewayOpened] = useState(false);
  const [markPaidState, setMarkPaidState] = useState<'idle' | 'loading' | 'completed'>('idle');
  const receiptGeneratedRef = useRef(false);

  useEffect(() => {
    if (!payload) {
      return;
    }

    if (payload.paymentStatus === 'dibayar' || payload.orderStatus === 'diproses') {
      return;
    }

    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchLatestStatus = async () => {
      if (!payload) {
        return;
      }
      try {
        setRefreshing(true);
        const latest = await publicGet<Order>(`/public/orders/${payload.orderId}`);
        if (!mounted) {
          return;
        }
        setPayload((current) => {
          if (!current) {
            return current;
          }
          const nextState = {
            ...current,
            paymentStatus: latest.payment_status,
            orderStatus: latest.order_status,
          };
          return nextState;
        });
      } catch (error) {
        // silent fail, will retry
      } finally {
        if (mounted) {
          setRefreshing(false);
        }
      }
    };

    fetchLatestStatus();
    intervalId = setInterval(fetchLatestStatus, 5000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [payload]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const data = readOrderSuccess();
    if (!data) {
      setChecked(true);
      router.replace('/order');
      return;
    }
    setPayload(data);
    setChecked(true);
  }, [router]);

  const qrisImageSrc = useMemo(() => {
    if (!payload?.snapToken) {
      return null;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload.snapToken)}`;
  }, [payload?.snapToken]);

  const paymentDeadline = useMemo(() => {
    if (!payload) {
      return null;
    }
    const createdAt = new Date(payload.createdAt);
    return new Date(createdAt.getTime() + 15 * 60 * 1000);
  }, [payload]);

  const readableOrderStatus = (status?: string | null) => {
    switch (status) {
      case 'baru':
        return 'Pesanan Baru';
      case 'diproses':
        return 'Sedang Diproses';
      case 'selesai':
        return 'Selesai';
      default:
        return 'Pesanan Baru';
    }
  };

  const kitchenStatusText = useMemo(() => {
    const status = payload?.orderStatus ?? 'baru';
    if (status === 'selesai') {
      return 'Hidangan telah diantar ke meja pelanggan dan transaksi dinyatakan selesai.';
    }
    if (status === 'diproses') {
      return 'Dapur sedang menyiapkan menu sesuai detail pesanan yang sudah terverifikasi.';
    }
    return 'Setelah pembayaran diverifikasi, tim dapur segera menyiapkan dan mengantar menu ke meja pelanggan.';
  }, [payload?.orderStatus]);

  const adminNotificationEntries = useMemo(() => {
    if (!payload) {
      return [];
    }
    return [
      { label: 'Nomor Pesanan', value: payload.orderCode },
      { label: 'Nama Pelanggan', value: payload.customerName },
      { label: 'Nomor Meja', value: payload.tableNumber },
      { label: 'Total Pembayaran', value: formatCurrency(payload.total) },
      { label: 'Metode Pembayaran', value: payload.paymentMethod === 'qris' ? 'QRIS' : 'Tunai' },
      { label: 'Status Pesanan', value: readableOrderStatus(payload.orderStatus) },
    ];
  }, [payload]);

  const handleBackToMenu = () => {
    clearOrderSuccess();
    router.replace('/order');
  };

  useEffect(() => {
    if (!payload || payload.paymentMethod !== 'cash') {
      return;
    }
    if (receiptGeneratedRef.current) {
      return;
    }

    const generateReceipt = async () => {
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const lineHeight = 8;
        let y = 20;

        doc.setFontSize(16);
        doc.text('Kejora Café', 14, y);
        y += lineHeight;
        doc.setFontSize(10);
        doc.text('Bukti Pemesanan Pembayaran Tunai', 14, y);
        y += lineHeight * 2;

        const summary = [
          `Nomor Pesanan : ${payload.orderCode}`,
          `Nama Pelanggan : ${payload.customerName}`,
          `Nomor Meja : ${payload.tableNumber}`,
          `Metode : Tunai di kasir`,
          `Total : ${formatCurrency(payload.total)}`,
          `Waktu : ${new Date(payload.createdAt).toLocaleString('id-ID', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}`,
        ];

        summary.forEach((text) => {
          doc.text(text, 14, y);
          y += lineHeight;
        });

        y += lineHeight;
        doc.setFontSize(12);
        doc.text('Rincian Item', 14, y);
        y += lineHeight;
        doc.setFontSize(10);

        payload.items.forEach((item) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${item.qty}x ${item.name} @ ${formatCurrency(item.price)} = ${formatCurrency(item.qty * item.price)}`, 14, y);
          y += lineHeight;
          if (item.note) {
            doc.text(`Catatan: ${item.note}`, 18, y);
            y += lineHeight;
          }
        });

        y += lineHeight;
        doc.setFontSize(10);
        doc.text('Tunjukkan struk ini ke kasir untuk menyelesaikan pembayaran.', 14, y);

        doc.save(`KejoraCash-${payload.orderCode}.pdf`);
        receiptGeneratedRef.current = true;
      } catch (error) {
        console.error('Gagal membuat struk PDF', error);
      }
    };

    generateReceipt();
  }, [payload]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!payload || payload.paymentMethod !== 'qris') {
      return;
    }
    if (!payload.snapToken || gatewayOpened) {
      return;
    }

    window.open(payload.snapToken, '_blank');
    setGatewayOpened(true);
  }, [payload, gatewayOpened]);

  const statusParam = router.query.status;
  const statusQuery = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const paymentCleared = payload?.paymentStatus === 'dibayar' || ['diproses', 'selesai'].includes(payload?.orderStatus ?? '');
  const isQris = payload?.paymentMethod === 'qris';
  const isQrisPaymentSuccess = Boolean(
    isQris &&
    (statusQuery?.toLowerCase() === 'success' || paymentCleared)
  );
  const shouldMarkPaidFallback = Boolean(
    payload &&
    isQris &&
    statusQuery?.toLowerCase() === 'success' &&
    !paymentCleared &&
    markPaidState === 'idle'
  );

  useEffect(() => {
    if (!shouldMarkPaidFallback || !payload) {
      return;
    }

    let cancelled = false;
    setMarkPaidState('loading');

    const markPaid = async () => {
      try {
        const response = await publicPost<{ order: Order }>(`/public/orders/${payload.orderId}/mark-paid`);
        if (cancelled) {
          return;
        }
        setPayload((current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            paymentStatus: response.order.payment_status,
            orderStatus: response.order.order_status,
          };
        });
      } catch (error) {
        console.error('Gagal menandai pembayaran QRIS secara otomatis', error);
      } finally {
        if (!cancelled) {
          setMarkPaidState('completed');
        }
      }
    };

    markPaid();

    return () => {
      cancelled = true;
    };
  }, [shouldMarkPaidFallback, payload]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center">
        <p className="text-sm text-slate-500">Menyiapkan halaman sukses...</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-500">Mengalihkan ke halaman pemesanan...</p>
        <button type="button" onClick={() => router.replace('/order')} className="px-4 py-2 rounded-full bg-brand-accent text-white">
          Kembali ke menu
        </button>
      </div>
    );
  }
  const isCashPaymentSuccess = !isQris && paymentCleared;
  const statusText = isQris
    ? isQrisPaymentSuccess
      ? 'Pembayaran berhasil diverifikasi. Pesanan sedang diproses oleh sistem.'
      : 'Sistem sedang memverifikasi pembayaran QRIS untuk memastikan transaksi berhasil dan valid.'
    : isCashPaymentSuccess
      ? 'Pembayaran tunai telah diverifikasi. Pesanan diteruskan ke dapur.'
      : '';

  return (
    <>
      <Head>
        <title>Pesanan Berhasil - KejoraCash</title>
      </Head>
      <div className="min-h-screen bg-brand-light/60 pb-20">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-accent">Pesanan berhasil</p>
            <h1 className="text-3xl font-bold text-brand-dark">Terima kasih, {payload.customerName}</h1>
            <p className="text-sm text-slate-500">{statusText}</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <section className="bg-white rounded-2xl shadow p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-widest text-brand-accent">Nomor Pesanan</p>
              <h2 className="text-2xl font-bold text-brand-dark">{payload.orderCode}</h2>
              <p className="text-sm text-slate-500">Meja {payload.tableNumber}</p>
              <p className="text-xs text-slate-400">
                Waktu pesanan {new Date(payload.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-500">Metode pembayaran</p>
                <p className="text-lg font-semibold text-brand-dark">{isQris ? 'QRIS' : 'Tunai di kasir'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total pembayaran</p>
                <p className="text-2xl font-semibold text-brand-accent">{formatCurrency(payload.total)}</p>
              </div>
            </div>
          </section>

          {isQris ? (
            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-accent">QRIS Dinamis</p>
                  <h2 className="text-xl font-semibold text-brand-dark">Merchant ID {MERCHANT_ID}</h2>
                  <p className="text-sm text-slate-500">Nomor pesanan {payload.orderCode}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${isQrisPaymentSuccess
                      ? 'text-green-600 bg-green-100'
                      : 'text-brand-accent bg-brand-accent/10'
                    }`}
                >
                  {isQrisPaymentSuccess ? 'Pembayaran Berhasil' : 'Sistem memverifikasi pembayaran'}
                </span>
              </div>
              <div className="flex flex-col items-center gap-4">
                {!isQrisPaymentSuccess &&
                  (qrisImageSrc ? (
                    <img src={qrisImageSrc} alt="QRIS Kejora" className="h-56 w-56 rounded-2xl border border-slate-100" />
                  ) : (
                    <div className="h-56 w-56 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-500">
                      QRIS akan muncul setelah sistem menerima token.
                    </div>
                  ))}
                {isQrisPaymentSuccess ? (
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-brand-dark">Pembayaran Berhasil</p>
                    <p className="text-xs text-slate-500">
                      Sistem menyimpan data pesananmu setelah pembayaran terverifikasi dan meneruskannya ke dapur.
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-500">
                      Sistem melakukan verifikasi pembayaran untuk memastikan transaksi berhasil dan valid sesuai metode yang digunakan.
                    </p>
                    <p className="text-xs text-slate-500">
                      Link pembayaran sudah dibuka otomatis di tab baru, jadi kamu tidak perlu membuka halaman pembayaran secara manual.
                    </p>
                  </div>
                )}
              </div>
              <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm text-brand-dark sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Rangkuman Pembayaran</p>
                  <ul className="mt-2 space-y-1">
                    <li>Merchant ID: <span className="font-semibold">{MERCHANT_ID}</span></li>
                    <li>Nomor Pesanan: <span className="font-semibold">{payload.orderCode}</span></li>
                    <li>Total Pembayaran: <span className="font-semibold">{formatCurrency(payload.total)}</span></li>
                  </ul>
                  <p className="mt-3 text-xs text-slate-600">
                    Merchant ID Cafe Kejora ({MERCHANT_ID}), Nomor Pesanan ({payload.orderCode}), Total Pembayaran ({formatCurrency(payload.total)}) dan batas waktu pembayaran tercantum jelas agar kasir serta pelanggan memiliki referensi yang sama.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Batas Waktu Pembayaran</p>
                  <p className="mt-2 font-semibold">
                    {paymentDeadline
                      ? paymentDeadline.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
                      : 'Menunggu data pesanan'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Invoice akan kadaluarsa otomatis setelah batas waktu ini.</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl shadow p-6">
              {isCashPaymentSuccess ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 font-semibold">
                  Pembayaran Berhasil - kasir telah memverifikasi dan pesananmu sedang diproses.
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                  {payload.message ?? 'Silakan bayar di kasir dengan menunjukkan nomor pesanan ini.'}
                </div>
              )}
            </section>
          )}

          {isQris ? (
            <>
              <section className="bg-white rounded-2xl shadow p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-accent">Timeline Pengalaman</p>
                  <h2 className="text-xl font-semibold text-brand-dark">Bagaimana transaksi ini berlangsung</h2>
                </div>
                <ol className="space-y-4 text-sm text-brand-dark">
                  <li className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-semibold">1. Halaman konfirmasi pembayaran</p>
                    <p className="mt-1 text-slate-600">
                      Sistem menampilkan QRIS dinamis lengkap dengan Merchant ID {MERCHANT_ID}, nomor pesanan {payload.orderCode}, total
                      {` ${formatCurrency(payload.total)}`} dan batas waktu pembayaran sehingga pelanggan bisa langsung memindai kode.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-semibold">2. Pemindaian kode QRIS</p>
                    <p className="mt-1 text-slate-600">
                      {isQrisPaymentSuccess
                        ? 'Pembayaran terverifikasi otomatis. Pesan “Pembayaran Berhasil” muncul tanpa perlu membuka halaman invoice.'
                        : 'Setelah pelanggan memindai QRIS dari aplikasi pembayaran, sistem menunggu verifikasi otomatis dari mitra pembayaran.'}
                    </p>
                  </li>
                  <li className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-semibold">3. Notifikasi dashboard admin</p>
                    <p className="mt-1 text-slate-600">
                      Admin menerima popup “Pesanan Baru” yang berisi detail pelanggan dan status sehingga tim kasir bisa langsung menindaklanjuti.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-slate-100 p-4">
                    <p className="font-semibold">4. Pengantaran hidangan</p>
                    <p className="mt-1 text-slate-600">{kitchenStatusText}</p>
                  </li>
                </ol>
              </section>

              <section className="bg-white rounded-2xl shadow p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-accent">Detail notifikasi admin</p>
                  <h2 className="text-xl font-semibold text-brand-dark">Data yang dikirim ke dashboard</h2>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {adminNotificationEntries.map((entry) => (
                    <div key={entry.label} className="rounded-2xl border border-slate-100 p-4">
                      <dt className="text-xs uppercase tracking-widest text-slate-500">{entry.label}</dt>
                      <dd className="mt-1 font-semibold text-brand-dark">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="bg-white rounded-2xl shadow p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-accent">Detail item</p>
                  <h2 className="text-xl font-semibold text-brand-dark">{payload.items.length} menu</h2>
                </div>
                <div className="space-y-4">
                  {payload.items.map((item, index) => (
                    <div key={`${item.menu_id}-${index}`} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <p className="font-semibold text-brand-dark">{item.name}</p>
                        <p className="text-xs text-slate-500">Qty {item.qty} × {formatCurrency(item.price)}</p>
                        {item.note && <p className="text-xs text-brand-accent mt-1">Catatan: {item.note}</p>}
                      </div>
                      <p className="font-semibold text-brand-accent">{formatCurrency(item.price * item.qty)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-brand-accent">Tata cara pembayaran kasir</p>
                <h2 className="text-xl font-semibold text-brand-dark">Langkah pembayaran manual</h2>
              </div>
              <ol className="space-y-4 text-sm text-brand-dark list-decimal list-inside">
                <li className="rounded-2xl border border-slate-100 p-4">
                  Tunjukkan nomor pesanan <span className="font-semibold text-brand-accent">{payload.orderCode}</span> dan total pembayaran
                  {` ${formatCurrency(payload.total)}`} kepada kasir.
                </li>
                <li className="rounded-2xl border border-slate-100 p-4">
                  Lakukan pembayaran sesuai nominal yang tertera, lalu tunggu kasir memverifikasi transaksi.
                </li>
                <li className="rounded-2xl border border-slate-100 p-4">
                  Setelah kasir menandai pesanan sebagai lunas, dapur otomatis mulai memproses hidangan kamu.
                </li>
                <li className="rounded-2xl border border-slate-100 p-4">
                  Simpan struk sebagai bukti dan duduk kembali di meja {payload.tableNumber}; tim kami akan mengantar pesanan.
                </li>
              </ol>
            </section>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBackToMenu}
              className="px-5 py-3 rounded-2xl border border-brand-accent text-brand-accent font-semibold hover:bg-brand-accent hover:text-white"
            >
              Kembali ke menu
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

