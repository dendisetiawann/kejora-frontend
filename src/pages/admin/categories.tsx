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
  const [modalOpen, setModalOpen] = useState(false);

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
      setModalOpen(false);
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
    setError(null);
    setModalOpen(true);
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
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-dark">Kategori</h2>
            <p className="text-sm text-slate-500">Kelola kategori yang muncul di halaman menu.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName('');
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark font-semibold px-4 py-2 rounded-xl shadow shadow-brand-accent/30 hover:bg-yellow-400"
          >
            <i className="fas fa-plus"></i>
            Tambah Kategori
          </button>
        </div>

        <ul className="mt-6 divide-y divide-slate-100">
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => {
                if (saving) return;
                setModalOpen(false);
                setTimeout(() => {
                  setEditingId(null);
                  setName('');
                  setError(null);
                }, 200);
              }}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
            >
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-2xl font-semibold text-brand-dark mb-2">
              {editingId ? 'Ubah Kategori' : 'Tambah Kategori'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">Masukkan nama kategori baru atau lakukan perubahan yang diperlukan.</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Nama Kategori
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                  placeholder="Contoh: Coffee"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (saving) return;
                    setModalOpen(false);
                    setTimeout(() => {
                      setEditingId(null);
                      setName('');
                      setError(null);
                    }, 200);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="inline-flex items-center gap-2 bg-brand-accent hover:bg-brand-dark text-brand-dark font-semibold px-5 py-2 rounded-xl disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin">
                        <i className="fas fa-spinner"></i>
                      </span>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

