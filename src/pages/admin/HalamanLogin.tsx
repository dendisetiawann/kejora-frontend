import Head from 'next/head';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';
import { adminLogin, setToken } from '@/lib/api';
import { extractErrorMessage } from '@/lib/errors';

export default function HalamanLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tampilNotifikasi = () => {
    if (!error) {
      return null;
    }
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
        {error}
      </div>
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi.');
      return;
    }

    setLoading(true);
    try {
      const response = await adminLogin({ username, password });
      setToken(response.token);
      router.replace('/admin/HalamanDashboard');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Username atau password salah.'));
    } finally {
      setLoading(false);
    }
  };

  const tampilHalamanLogin = () => (
    <>
      <Head>
        <title>Login Admin • KejoraCash</title>
      </Head>
      <div className="min-h-screen bg-brand-light flex items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 space-y-6"
        >
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-brand-accent">KejoraCash</p>
            <h1 className="mt-2 text-2xl font-bold text-brand-dark">Login Admin</h1>
            <p className="text-sm text-slate-500">Masuk untuk mengelola pesanan.</p>
          </div>

          {tampilNotifikasi()}

          <label className="flex flex-col text-sm font-semibold text-brand-dark/80">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin_budi"
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            />
          </label>

          <label className="flex flex-col text-sm font-semibold text-brand-dark/80">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••"
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent hover:bg-brand-dark text-white font-semibold py-3 rounded-xl shadow-lg transition disabled:opacity-60"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </>
  );

  return tampilHalamanLogin();
}

