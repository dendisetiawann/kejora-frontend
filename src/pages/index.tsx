import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>KejoraCash</title>
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-brand-DEFAULT" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-brand-DEFAULT/5 to-transparent" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="inline-block">
              <span className="px-3 py-1 rounded-full border border-brand-DEFAULT/30 text-brand-DEFAULT text-xs font-bold tracking-[0.2em] uppercase bg-white/50 backdrop-blur-sm">
                Kejora Café
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-brand-dark tracking-tight leading-tight">
              Coffee for <br />
              <span className="text-brand-DEFAULT">Every Moment</span>
            </h1>
            <p className="text-lg text-brand-dark/70 max-w-lg mx-auto leading-relaxed">
              Nikmati racikan kopi terbaik dengan suasana yang menenangkan. Pesan sekarang dan rasakan perbedaannya.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/order"
              className="px-8 py-4 rounded-full border-2 border-black bg-white text-brand-dark font-semibold"
            >
              Mulai Pesan
            </Link>
            <Link
              href="/admin/HalamanLogin"
              className="px-8 py-4 rounded-full border-2 border-black bg-white text-brand-dark font-semibold"
            >
              Masuk Admin
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

