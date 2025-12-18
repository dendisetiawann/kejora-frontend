type PaymentMethod = 'cash' | 'qris';

interface HalamanKonfirmasiPembayaranProps {
  paymentMethod: PaymentMethod;
  onPaymentSelect: (method: PaymentMethod) => void;
  customerNote: string;
  onNoteChange: (value: string) => void;
  error: string | null;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

const tampilHalamanKonfirmasiPembayaran = ({
  paymentMethod,
  onPaymentSelect,
  customerNote,
  onNoteChange,
  error,
  submitting,
  onBack,
  onSubmit,
}: HalamanKonfirmasiPembayaranProps) => (
  <>
    <div className="grid gap-6 md:grid-cols-2">
      <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50 flex flex-col">
        <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4 flex items-center gap-2">
          <i className="fas fa-comment-alt text-gray-400"></i> Catatan
        </h3>
        <textarea
          value={customerNote}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Contoh: Jangan terlalu manis, es dipisah..."
          className="w-full flex-1 min-h-[100px] rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:bg-white transition-all resize-none"
        />
      </section>

      <section className="backdrop-blur-xl bg-white/80 rounded-3xl p-6 shadow-lg shadow-brand-accent/5 border border-white/50">
        <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4 flex items-center gap-2">
          <i className="fas fa-wallet text-gray-400"></i> Pembayaran
        </h3>
        <div className="space-y-3">
          {(['cash', 'qris'] as PaymentMethod[]).map((method) => {
            const isActive = paymentMethod === method;
            return (
              <label
                key={method}
                className={
                  'relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ' +
                  (isActive ? 'border-brand-accent bg-brand-accent/5 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100')
                }
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={method}
                  checked={isActive}
                  onChange={() => onPaymentSelect(method)}
                  className="hidden"
                />
                <div
                  className={
                    'w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ' +
                    (isActive ? 'bg-brand-accent text-white' : 'bg-white text-gray-400')
                  }
                >
                  <i className={'fas ' + (method === 'cash' ? 'fa-money-bill-wave' : 'fa-qrcode')}></i>
                </div>
                <div>
                  <p className={'font-bold text-sm ' + (isActive ? 'text-brand-dark' : 'text-gray-600')}>
                    {method === 'cash' ? 'Tunai' : 'QRIS'}
                  </p>
                  <p className="text-xs text-gray-400">{method === 'cash' ? 'Bayar di kasir' : 'Scan kode QR'}</p>
                </div>
                {isActive && (
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 text-brand-accent">
                    <i className="fas fa-check-circle text-xl"></i>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </section>
    </div>

    {error && (
      <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2 animate-pulse">
        <i className="fas fa-exclamation-circle"></i>
        {error}
      </div>
    )}

    <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="w-full sm:w-auto px-8 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        Kembali
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="flex-1 bg-gradient-to-r from-brand-dark to-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-dark/20 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Memproses Pesanan...</span>
          </>
        ) : (
          <span>Pesan Sekarang</span>
        )}
      </button>
    </div>
  </>
);

export { tampilHalamanKonfirmasiPembayaran };
export type { PaymentMethod, HalamanKonfirmasiPembayaranProps };

export default function HalamanKonfirmasiPembayaran(props: HalamanKonfirmasiPembayaranProps) {
  return tampilHalamanKonfirmasiPembayaran(props);
}
