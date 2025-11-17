import { FormEvent, useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminDelete, adminGet, adminPost, adminPut } from '@/lib/api';
import { extractErrorMessage } from '@/lib/errors';
import { Category } from '@/types/entities';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await adminGet<Category[]>('/admin/categories');
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await adminPut(`/admin/categories/${editingId}`, { name });
      } else {
        await adminPost('/admin/categories', { name });
      }
      setName('');
      setEditingId(null);
      loadCategories();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal menyimpan kategori.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Hapus kategori ${category.name}?`)) return;
    try {
      await adminDelete(`/admin/categories/${category.id}`);
      loadCategories();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Tidak dapat menghapus kategori.'));
    }
  };

  return (
    <AdminLayout title="Kelola Kategori">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-dark">Kategori</h2>
            {loading && <span className="text-sm text-slate-400">Memuat...</span>}
          </div>
          <ul className="divide-y divide-slate-100">
            {categories.map((category) => (
              <li key={category.id} className="py-3 flex items-center justify-between">
                <span className="font-semibold text-brand-dark">{category.name}</span>
                <div className="space-x-3 text-sm">
                  <button onClick={() => handleEdit(category)} className="text-brand-accent font-semibold">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(category)} className="text-red-500 font-semibold">
                    Hapus
                  </button>
                </div>
              </li>
            ))}
            {!loading && categories.length === 0 && (
              <li className="py-6 text-center text-slate-500 text-sm">Belum ada kategori.</li>
            )}
          </ul>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-brand-dark mb-4">
            {editingId ? 'Ubah Kategori' : 'Tambah Kategori'}
          </h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="text-sm font-semibold text-slate-600 flex flex-col">
              Nama Kategori
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white font-semibold py-2 rounded-xl disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setEditingId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </AdminLayout>
  );
}

