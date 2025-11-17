import { FormEvent, useEffect, useState } from 'react';
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
  };

  const handleDelete = async (menu: Menu) => {
    if (!confirm(`Hapus menu ${menu.name}?`)) return;
    await adminDelete(`/admin/menus/${menu.id}`);
    loadData();
  };

  const handleToggle = async (menu: Menu) => {
    await adminPut(`/admin/menus/${menu.id}`, {
      category_id: menu.category_id,
      name: menu.name,
      description: menu.description,
      price: menu.price,
      photo_path: menu.photo_path,
      is_visible: !menu.is_visible,
    });
    loadData();
  };

  return (
    <AdminLayout title="Kelola Menu">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-dark">Daftar Menu</h2>
            {loading && <span className="text-sm text-slate-400">Memuat...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2">Nama</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                  <th>Visibilitas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {menus.map((menu) => (
                  <tr key={menu.id} className="border-b border-slate-50">
                    <td className="py-2 font-semibold text-brand-dark">{menu.name}</td>
                    <td>{menu.category?.name}</td>
                    <td className="text-brand-accent font-semibold">{formatCurrency(menu.price)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggle(menu)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          menu.is_visible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {menu.is_visible ? 'Tampil' : 'Disembunyikan'}
                      </button>
                    </td>
                    <td className="space-x-2 py-2">
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
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-brand-dark mb-4">
            {form.id ? 'Ubah Menu' : 'Tambah Menu'}
          </h2>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
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
                }}
                className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(e) => setForm({ ...form, is_visible: e.target.checked })}
              />
              Tampilkan ke pelanggan
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white font-semibold py-2 rounded-xl disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(defaultForm)}
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

