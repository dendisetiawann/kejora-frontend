import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>KejoraCash</title>
      </Head>
      <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm uppercase tracking-widest text-brand-accent mb-2">KejoraCash</p>
        <h1 className="text-3xl font-bold text-brand-dark mb-6">Sistem Pemesanan Café Modern</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/order"
            className="px-6 py-3 rounded-xl bg-brand-accent text-white font-semibold shadow-lg hover:bg-brand-dark transition"
          >
            Mulai Pesan
          </Link>
          <Link
            href="/admin/login"
            className="px-6 py-3 rounded-xl border border-brand-accent text-brand-accent font-semibold hover:bg-white transition"
          >
            Masuk Admin
          </Link>
        </div>
      </div>
    </>
  );
}

