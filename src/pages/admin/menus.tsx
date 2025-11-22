import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { adminDelete, adminGet, adminPost, adminPut } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Category, Menu } from '@/types/entities';
import { extractErrorMessage } from '@/lib/errors';

type MenuForm = {
  id?: number | null;
  category_id: string;
  name: string;
  description: string;
  price: string;
  photo_path: string;
  photo?: File;
  is_visible: boolean;
};

const defaultForm: MenuForm = {
  id: null,
  category_id: '',
  name: '',
  description: '',
  price: '',
  photo_path: '',
  is_visible: true,
};

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<MenuForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [menusData, categoriesData] = await Promise.all([
        adminGet<Menu[]>('/admin/menus'),
        adminGet<Category[]>('/admin/categories'),
      ]);
      setMenus(menusData);
      setCategories(categoriesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('category_id', String(form.category_id));
    formData.append('name', form.name);
    formData.append('description', form.description || '');
    formData.append('price', String(form.price));
    formData.append('is_visible', String(form.is_visible));
    if (form.photo) {
      formData.append('photo', form.photo);
    } else {
      // Always include photo_path, even if empty
      formData.append('photo_path', form.photo_path || '');
    }

    try {
      if (form.id) {
        formData.append('_method', 'PUT');
        await adminPost(`/admin/menus/${form.id}`, formData);
      } else {
        await adminPost('/admin/menus', formData);
      }
      setForm(defaultForm);
      setPhotoPreview(null);
      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Gagal menyimpan menu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (menu: Menu) => {
    setForm({
      id: menu.id,
      category_id: String(menu.category_id),
      name: menu.name,
      description: menu.description ?? '',
      price: String(menu.price),
      photo_path: menu.photo_path ?? '',
      is_visible: menu.is_visible,
    });
    setPhotoPreview(menu.photo_path ? menu.photo_path : null);
    setModalOpen(true);
  };

  const handleDelete = async (menu: Menu) => {
    if (!confirm(`Hapus menu ${menu.name}?`)) return;
    await adminDelete(`/admin/menus/${menu.id}`);
    loadData();
  };

  const handleToggle = async (menu: Menu) => {
    const nextVisible = !menu.is_visible;
    setTogglingId(menu.id);
    setMenus((prev) => prev.map((item) => (item.id === menu.id ? { ...item, is_visible: nextVisible } : item)));

    try {
      await adminPut(`/admin/menus/${menu.id}`, {
        category_id: menu.category_id,
        name: menu.name,
        description: menu.description,
        price: menu.price,
        photo_path: menu.photo_path,
        is_visible: nextVisible,
      });
    } catch (err: unknown) {
      setMenus((prev) => prev.map((item) => (item.id === menu.id ? { ...item, is_visible: menu.is_visible } : item)));
      alert(extractErrorMessage(err, 'Gagal mengubah visibilitas menu.'));
    } finally {
      setTogglingId(null);
    }
  };

  const visibleMenus = useMemo(
    () => menus.sort((a, b) => a.name.localeCompare(b.name)),
    [menus]
  );

  const handleCreate = () => {
    setForm(defaultForm);
    setPhotoPreview(null);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setTimeout(() => {
      setForm(defaultForm);
      setPhotoPreview(null);
      setError(null);
    }, 200);
  };

  return (
    <AdminLayout title="Kelola Menu">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-dark">Daftar Menu</h2>
            <p className="text-sm text-slate-500">Kelola item yang tampil di halaman pemesanan.</p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark font-semibold px-4 py-2 rounded-xl shadow shadow-brand-accent/30 hover:bg-yellow-400"
          >
            <i className="fas fa-plus"></i>
            Tambah Menu
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2">Nama</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Visibilitas</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleMenus.map((menu) => (
                <tr key={menu.id} className="border-b border-slate-50">
                  <td className="py-3">
                    <p className="font-semibold text-brand-dark">{menu.name}</p>
                    {menu.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{menu.description}</p>
                    )}
                  </td>
                  <td>{menu.category?.name ?? '-'}</td>
                  <td className="text-brand-accent font-semibold">{formatCurrency(menu.price)}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggle(menu)}
                      disabled={togglingId === menu.id}
                      className={`flex items-center w-20 rounded-full px-1 py-1 text-xs font-semibold transition-colors ${
                        menu.is_visible ? 'bg-emerald-100 text-emerald-700 justify-end' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full bg-white shadow flex items-center justify-center ${menu.is_visible ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {togglingId === menu.id ? (
                          <span className="animate-spin text-xs">
                            <i className="fas fa-spinner"></i>
                          </span>
                        ) : (
                          <i className={menu.is_visible ? 'fas fa-check' : 'fas fa-xmark'}></i>
                        )}
                      </span>
                      <span className="flex-1 text-center">
                        {menu.is_visible ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </button>
                  </td>
                  <td className="text-right space-x-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(menu)}
                      className="text-sm text-brand-accent font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(menu)}
                      className="text-sm text-red-500 font-semibold"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && menus.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-500">
                    Belum ada menu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
            >
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-2xl font-semibold text-brand-dark mb-2">
              {form.id ? 'Ubah Menu' : 'Tambah Menu'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Lengkapi informasi menu. Perubahan langsung tersimpan di daftar menu setelah disubmit.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Kategori
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Nama Menu
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Deskripsi
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Harga (Rp)
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Foto (opsional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setForm({ ...form, photo: file || undefined, photo_path: '' });
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setPhotoPreview(previewUrl);
                    } else {
                      setPhotoPreview(null);
                    }
                  }}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="mt-2 h-36 w-full object-cover rounded-xl border border-slate-100" />
                )}
              </label>
              <label className="flex items-center justify-between text-sm font-semibold text-slate-600">
                <span>Tampilkan ke pelanggan</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_visible: !prev.is_visible }))}
                  className={`flex items-center w-20 rounded-full px-1 py-1 text-xs font-semibold transition-colors ${
                    form.is_visible ? 'bg-emerald-100 text-emerald-700 justify-end' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  <span
                    className={`h-6 w-6 rounded-full bg-white shadow flex items-center justify-center ${form.is_visible ? 'text-emerald-500' : 'text-rose-500'}`}
                  >
                    <i className={form.is_visible ? 'fas fa-check' : 'fas fa-xmark'}></i>
                  </span>
                  <span className="flex-1 text-center">
                    {form.is_visible ? 'Aktif' : 'Nonaktif'}
                  </span>
                </button>
              </label>
              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-brand-accent hover:bg-brand-dark text-brand-dark font-semibold px-5 py-2 rounded-xl disabled:opacity-60"
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
                      Simpan Menu
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

