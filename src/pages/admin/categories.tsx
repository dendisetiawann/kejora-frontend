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

  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);

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

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    // Client-side validation
    if (!name.trim()) {
      setError('Nama kategori tidak boleh kosong.');
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await adminPut(`/admin/categories/${editingId}`, { name });
        showNotification('Kategori berhasil diperbarui');
      } else {
        await adminPost('/admin/categories', { name });
        showNotification('Kategori berhasil ditambahkan');
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

  const handleDeleteClick = (category: Category) => {
    setConfirmModal({
      isOpen: true,
      message: 'Apakah Anda yakin ingin menghapus kategori ini?',
      onConfirm: () => performDelete(category),
    });
  };

  const performDelete = async (category: Category) => {
    setConfirmModal(null); // Close modal
    try {
      await adminDelete(`/admin/categories/${category.id}`);
      showNotification('Kategori berhasil dihapus');
      loadCategories();
    } catch (err: unknown) {
      showNotification(extractErrorMessage(err, 'Kategori tidak dapat dihapus karena masih digunakan oleh menu aktif.'), 'error');
    }
  };

  return (
    <AdminLayout title="Kelola Kategori">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-right ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-xl`}></i>
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-up">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-trash-alt text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Hapus</h3>
              <p className="text-gray-500">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Kategori</h2>
            <p className="text-sm text-slate-500 mt-1">Kelola kategori yang muncul di halaman menu.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName('');
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-brand-accent/20 hover:shadow-brand-accent/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            <i className="fas fa-plus"></i>
            Tambah Kategori
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 pl-6">Nama Kategori</th>
                <th className="py-4">Jumlah Menu</th>
                <th className="py-4 text-right pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-brand-accent/5 transition-colors duration-200 group">
                  <td className="py-4 pl-6 font-bold text-brand-dark text-base">
                    {category.name}
                  </td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-accent/10 text-brand-dark border border-brand-accent/20">
                      {category.menu_count || 0} Menu
                    </span>
                  </td>
                  <td className="py-4 text-right pr-6 space-x-4">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-sm font-bold text-brand-accent hover:text-yellow-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(category)}
                      className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <i className="fas fa-layer-group text-xl"></i>
                      </div>
                      <p>Belum ada kategori.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                  className="inline-flex items-center gap-2 bg-brand-accent hover:bg-[#ffe08c] text-brand-dark font-semibold px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
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
                      {editingId ? 'Simpan Perubahan' : 'Simpan'}
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

