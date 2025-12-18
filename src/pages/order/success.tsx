/* eslint-disable @next/next/no-img-element */
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { clearOrderSuccess, OrderSuccessPayload, readOrderSuccess } from '@/lib/orderSuccess';
import { publicGet, publicPost } from '@/lib/api';
import { Pesanan } from '@/types/entities';

const MERCHANT_ID = process.env.NEXT_PUBLIC_QRIS_MERCHANT_ID ?? '9988123';

export default function OrderSuccessPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<OrderSuccessPayload | null>(null);
  const [checked, setChecked] = useState(false);
  const [gatewayOpened, setGatewayOpened] = useState(false);
  const [markPaidState, setMarkPaidState] = useState<'idle' | 'loading' | 'completed'>('idle');

  useEffect(() => {
    if (!payload) {
      return;
    }

    if (payload.paymentStatus === 'dibayar' || payload.orderStatus === 'diproses') {
      return;
    }

    let mounted = true;
    const fetchLatestStatus = async () => {
      if (!payload) {
        return;
      }
      try {
        const latest = await publicGet<Pesanan>(`/public/orders/${payload.orderId}`);
        if (!mounted) {
          return;
        }
        setPayload((current) => {
          if (!current) {
            return current;
          }
          const nextState = {
            ...current,
            paymentStatus: latest.status_pembayaran,
            orderStatus: latest.status_pesanan,
          };
          return nextState;
        });
      } catch {
        // silent fail, will retry
      }
    };

    fetchLatestStatus();
    const intervalId = setInterval(fetchLatestStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
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
    // 24 hours deadline
    return new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
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

  const handleBackToMenu = () => {
    clearOrderSuccess();
    router.replace('/order');
  };

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

  const lastGeneratedStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!payload) {
      return;
    }

    // Check if payment is successful (either Cash verified or QRIS success)
    const isCash = payload.paymentMethod === 'cash';
    const isQrisSuccess = payload.paymentMethod === 'qris' && isQrisPaymentSuccess;

    // Determine current status for receipt
    let currentStatus = 'UNKNOWN';
    if (isCash) {
      currentStatus = paymentCleared ? 'PAID' : 'PENDING';
    } else if (payload.paymentMethod === 'qris') {
      currentStatus = isQrisSuccess ? 'PAID' : 'PENDING';
    }

    // Only generate if status changed (e.g. PENDING -> PAID) or hasn't been generated yet
    // For QRIS, we might still only want to generate on PAID, but for Cash we want both.

    if (payload.paymentMethod === 'qris' && currentStatus !== 'PAID') {
      return;
    }

    if (lastGeneratedStatusRef.current === currentStatus) {
      return;
    }

    const generateReceipt = async () => {
      try {
        const { jsPDF } = await import('jspdf');
        // Create a PDF with A6 size (105mm x 148mm)
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a6'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;
        const margin = 6;
        let y = 10;

        // Styling helpers
        const drawDashedLine = (yPos: number) => {
          doc.setLineWidth(0.1);
          (doc as any).setLineDash([1, 1], 0);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          (doc as any).setLineDash([], 0); // reset
        };

        const drawSolidLine = (yPos: number) => {
          doc.setLineWidth(0.2);
          (doc as any).setLineDash([], 0);
          doc.line(margin, yPos, pageWidth - margin, yPos);
        };

        // -- HEADER --
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('CAFE KEJORA', centerX, y, { align: 'center' });
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const address = 'Jl. Letnan Boyak, Bangkinang, Kec. Bangkinang, Kabupaten Kampar, Riau';
        const addressLines = doc.splitTextToSize(address, pageWidth - (margin * 2));
        doc.text(addressLines, centerX, y, { align: 'center' });
        y += (addressLines.length * 3.5) + 1;

        doc.text('Telp: 0838-9627-7278', centerX, y, { align: 'center' });
        y += 5;

        drawSolidLine(y);
        y += 4;

        // -- ORDER INFO --
        doc.setFontSize(9);
        doc.text(`No. Order: ${payload.orderCode}`, margin, y);
        doc.text(new Date(payload.createdAt).toLocaleDateString('id-ID'), pageWidth - margin, y, { align: 'right' });
        y += 4.5;
        
        doc.text(`Meja: ${payload.tableNumber}`, margin, y);
        doc.text(new Date(payload.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), pageWidth - margin, y, { align: 'right' });
        y += 4.5;

        doc.text(`Pelanggan: ${payload.customerName}`, margin, y);
        y += 5;

        drawDashedLine(y);
        y += 4;

        // -- ITEMS --
        doc.setFontSize(9);
        payload.items.forEach((item) => {
          doc.setFont('helvetica', 'bold');
          doc.text(item.name, margin, y);
          y += 4;

          doc.setFont('helvetica', 'normal');
          const priceStr = `${item.qty} x ${formatCurrency(item.price)}`;
          const totalStr = formatCurrency(item.qty * item.price);

          doc.text(priceStr, margin + 4, y);
          doc.text(totalStr, pageWidth - margin, y, { align: 'right' });
          y += 4.5;

          if (item.note) {
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`(${item.note})`, margin + 4, y);
            doc.setTextColor(0);
            doc.setFontSize(9);
            y += 4;
          }
          y += 1.5; // spacing between items
        });

        drawSolidLine(y);
        y += 4;

        // -- TOTALS --
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL', margin, y);
        doc.text(formatCurrency(payload.total), pageWidth - margin, y, { align: 'right' });
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Metode Pembayaran', margin, y);
        doc.text(payload.paymentMethod === 'qris' ? 'QRIS' : 'Tunai', pageWidth - margin, y, { align: 'right' });
        y += 5;

        doc.text('Status', margin, y);
        const isPaid = currentStatus === 'PAID';
        const statusLabel = isPaid ? 'LUNAS' : 'BELUM LUNAS';
        
        if (isPaid) {
            doc.setTextColor(0, 128, 0); // Green
        } else {
            doc.setTextColor(200, 0, 0); // Red
        }
        doc.setFont('helvetica', 'bold');
        doc.text(statusLabel, pageWidth - margin, y, { align: 'right' });
        doc.setTextColor(0); // Reset
        y += 8;

        // -- FOOTER --
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('Terima kasih atas kunjungan Anda!', centerX, y, { align: 'center' });
        y += 4.5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Wifi: KejoraFree / Pass: kopi123', centerX, y, { align: 'center' });

        const fileName = isPaid ? `Struk-Lunas-${payload.orderCode}.pdf` : `Struk-Tagihan-${payload.orderCode}.pdf`;
        doc.save(fileName);
        lastGeneratedStatusRef.current = currentStatus;
      } catch (error) {
        console.error('Gagal membuat struk PDF', error);
      }
    };

    generateReceipt();
  }, [payload, paymentCleared, isQrisPaymentSuccess]);

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

  useEffect(() => {
    if (!shouldMarkPaidFallback || !payload) {
      return;
    }

    let cancelled = false;
    setMarkPaidState('loading');

    const markPaid = async () => {
      try {
        const response = await publicPost<{ order: Pesanan }>(`/public/orders/${payload.orderId}/mark-paid`);
        if (cancelled) {
          return;
        }
        setPayload((current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            paymentStatus: response.order.status_pembayaran,
            orderStatus: response.order.status_pesanan,
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
      <div className="min-h-screen bg-brand-light/40 pb-20 font-sans text-slate-800">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Pesanan Berhasil</p>
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
              Terima kasih, {payload.customerName}
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">{statusText}</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Order Summary Card */}
          <section className="backdrop-blur-xl bg-white/80 border border-white/50 shadow-xl rounded-3xl p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-accent/5 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-brand-accent font-bold">Nomor Pesanan</p>
              <h2 className="text-4xl font-black text-brand-dark tracking-tight">{payload.orderCode}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-medium">
                  Meja {payload.tableNumber}
                </span>
                <span>•</span>
                <span>{new Date(payload.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</span>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <div className="grid gap-6 sm:grid-cols-2 relative z-10">
              <div>
                <p className="text-xs text-slate-500 mb-1">Metode pembayaran</p>
                <p className="text-lg font-bold text-brand-dark flex items-center gap-2">
                  {isQris ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      QRIS
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Tunai di kasir
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total pembayaran</p>
                <p className="text-2xl font-black text-brand-accent">{formatCurrency(payload.total)}</p>
              </div>
            </div>
          </section>

          {isQris ? (
            <section className="backdrop-blur-xl bg-white/80 border border-white/50 shadow-xl rounded-3xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-brand-accent font-bold">QRIS Dinamis</p>
                  <h2 className="text-xl font-bold text-brand-dark mt-1">Cafe Kejora ({MERCHANT_ID})</h2>
                </div>
                <span
                  className={`text-xs font-bold px-4 py-2 rounded-full border ${isQrisPaymentSuccess
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : 'text-brand-accent bg-brand-accent/5 border-brand-accent/20'
                    }`}
                >
                  {isQrisPaymentSuccess ? 'Pembayaran Berhasil' : 'Menunggu Pembayaran'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-6 py-4">
                {!isQrisPaymentSuccess &&
                  (qrisImageSrc ? (
                    <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-100">
                      <img src={qrisImageSrc} alt="QRIS Kejora" className="h-64 w-64 rounded-xl" />
                    </div>
                  ) : (
                    <div className="h-64 w-64 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-500 bg-slate-50">
                      QRIS akan muncul setelah sistem menerima token.
                    </div>
                  ))}

                {isQrisPaymentSuccess ? (
                  <div className="text-center space-y-2 max-w-md">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-lg font-bold text-brand-dark">Pembayaran Berhasil</p>
                    <p className="text-sm text-slate-500">
                      Sistem menyimpan data pesananmu setelah pembayaran terverifikasi dan meneruskannya ke dapur.
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-2 max-w-md">
                    <p className="text-sm text-slate-600">
                      Sistem melakukan verifikasi pembayaran untuk memastikan transaksi berhasil dan valid sesuai metode yang digunakan.
                    </p>
                    <p className="text-xs text-slate-400">
                      Link pembayaran sudah dibuka otomatis di tab baru.
                    </p>
                  </div>
                )}
              </div>

              <div className={`grid gap-4 rounded-2xl bg-slate-50/50 border border-slate-100 p-6 text-sm text-brand-dark ${!isQrisPaymentSuccess ? 'sm:grid-cols-2' : ''}`}>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Rangkuman</p>
                  <ul className="mt-3 space-y-2">
                    <li className="flex justify-between">
                      <span className="text-slate-500">Merchant</span>
                      <span className="font-semibold">Cafe Kejora ({MERCHANT_ID})</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500">Order ID</span>
                      <span className="font-semibold">{payload.orderCode}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-500">Total</span>
                      <span className="font-semibold text-brand-accent">{formatCurrency(payload.total)}</span>
                    </li>
                  </ul>
                </div>
                {!isQrisPaymentSuccess && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Batas Waktu</p>
                    <p className="mt-3 font-semibold text-lg">
                      {paymentDeadline
                        ? paymentDeadline.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
                        : '--:--'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Invoice kadaluarsa otomatis setelah waktu ini.</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="backdrop-blur-xl bg-white/80 border border-white/50 shadow-xl rounded-3xl p-8 space-y-6">
              {isCashPaymentSuccess ? (
                <div className="rounded-2xl border border-green-200 bg-green-50/50 p-6 flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800">Pembayaran Berhasil</h3>
                    <p className="text-sm text-green-700 mt-1">Kasir telah memverifikasi dan pesananmu sedang diproses.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
                  <p className="text-slate-600 font-medium">Pesanan diterima, silakan bayar di kasir dengan menunjukkan nomor pesanan anda.</p>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-widest text-brand-accent font-bold mb-4">Tata cara pembayaran kasir</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold">1</div>
                    <p className="text-sm text-slate-600 pt-1">
                      Tunjukkan nomor pesanan <span className="font-bold text-brand-dark">{payload.orderCode}</span> dan total pembayaran
                      <span className="font-bold text-brand-dark">{` ${formatCurrency(payload.total)}`}</span> kepada kasir.
                    </p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold">2</div>
                    <p className="text-sm text-slate-600 pt-1">
                      Lakukan pembayaran sesuai nominal yang tertera, lalu tunggu kasir memverifikasi transaksi.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleBackToMenu}
              className="px-8 py-4 rounded-full bg-gray-900 text-white font-bold"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
