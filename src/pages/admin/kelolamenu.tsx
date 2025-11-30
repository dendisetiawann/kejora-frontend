import { FormEvent, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import ToggleSwitch from '@/components/ToggleSwitch';
import { adminDelete, adminGet, adminPost, adminPut } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Kategori, Menu } from '@/types/entities';
import { extractErrorMessage } from '@/lib/errors';
import { resolveMenuPhoto } from '@/lib/menuPhoto';

type MenuForm = {
  id_menu?: number | null;
  id_kategori: string;
  nama_menu: string;
  deskripsi_menu: string;
  harga_menu: string;
  foto_menu: string;
  foto?: File;
  status_visibilitas: boolean;
};

const BREAKPOINT_DESCRIPTION = 97;

const forceWrapText = (value: string, chunkSize = BREAKPOINT_DESCRIPTION): string => {
  if (!value) return '';
  const regex = new RegExp(`.{1,${chunkSize}}`, 'g');
  return (value.match(regex) ?? []).join('\n');
};

const defaultForm: MenuForm = {
  id_menu: null,
  id_kategori: '',
  nama_menu: '',
  deskripsi_menu: '',
  harga_menu: '',
  foto_menu: '',
  status_visibilitas: true,
};

export default function KelolaMenuPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [form, setForm] = useState<MenuForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [menusData, categoriesData] = await Promise.all([
        adminGet<Menu[]>('/admin/kelolamenu'),
        adminGet<Kategori[]>('/admin/kelolakategori'),
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

    if (!form.nama_menu.trim()) {
      setError('Nama menu tidak boleh kosong.');
      setSaving(false);
      return;
    }
    if (!form.id_kategori) {
      setError('Kategori harus dipilih.');
      setSaving(false);
      return;
    }
    const price = Number(form.harga_menu);
    if (isNaN(price) || price <= 0) {
      setError('Harga harus berupa angka positif (tidak boleh 0).');
      setSaving(false);
      return;
    }
    if (form.foto) {
      if (form.foto.size > 10 * 1024 * 1024) {
        setError('Ukuran foto maksimal 10MB.');
        setSaving(false);
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(form.foto.type)) {
        setError('Format foto harus JPG atau PNG.');
        setSaving(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('id_kategori', String(form.id_kategori));
    formData.append('nama_menu', form.nama_menu);
    formData.append('deskripsi_menu', form.deskripsi_menu || '');
    formData.append('harga_menu', String(form.harga_menu));
    formData.append('status_visibilitas', String(form.status_visibilitas));
    if (form.foto) {
      formData.append('foto', form.foto);
    } else {
      formData.append('foto_menu', form.foto_menu || '');
    }

    try {
      if (form.id_menu) {
        formData.append('_method', 'PUT');
        await adminPost(`/admin/kelolamenu/${form.id_menu}`, formData);
        showNotification('Menu berhasil diperbarui');
      } else {
        await adminPost('/admin/kelolamenu', formData);
        showNotification('Menu berhasil ditambahkan');
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
      id_menu: menu.id_menu,
      id_kategori: String(menu.id_kategori),
      nama_menu: menu.nama_menu,
      deskripsi_menu: menu.deskripsi_menu ?? '',
      harga_menu: String(menu.harga_menu),
      foto_menu: menu.foto_menu ?? '',
      status_visibilitas: menu.status_visibilitas,
    });
    setPhotoPreview(menu.foto_menu ? resolveMenuPhoto(menu) : null);
    setModalOpen(true);
  };

  const handleDeleteClick = (menu: Menu) => {
    setConfirmModal({
      isOpen: true,
      message: 'Apakah Anda yakin ingin menghapus menu ini?',
      onConfirm: () => performDelete(menu),
    });
  };

  const performDelete = async (menu: Menu) => {
    setConfirmModal(null);
    try {
      await adminDelete(`/admin/kelolamenu/${menu.id_menu}`);
      showNotification('Menu berhasil dihapus');
      loadData();
    } catch (err: unknown) {
      showNotification(extractErrorMessage(err, 'Gagal menghapus menu.'), 'error');
    }
  };

  const handleToggle = async (menu: Menu) => {
    const nextVisible = !menu.status_visibilitas;
    setTogglingId(menu.id_menu);
    setMenus((prev) => prev.map((item) => (item.id_menu === menu.id_menu ? { ...item, status_visibilitas: nextVisible } : item)));

    try {
      await adminPut(`/admin/kelolamenu/${menu.id_menu}`, {
        id_kategori: menu.id_kategori,
        nama_menu: menu.nama_menu,
        deskripsi_menu: menu.deskripsi_menu,
        harga_menu: menu.harga_menu,
        foto_menu: menu.foto_menu,
        status_visibilitas: nextVisible,
      });
      showNotification('Visibilitas menu berhasil diperbarui');
    } catch (err: unknown) {
      setMenus((prev) => prev.map((item) => (item.id_menu === menu.id_menu ? { ...item, status_visibilitas: menu.status_visibilitas } : item)));
      showNotification(extractErrorMessage(err, 'Gagal mengubah visibilitas menu.'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const visibleMenus = useMemo(() => menus.sort((a, b) => a.nama_menu.localeCompare(b.nama_menu)), [menus]);

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
      {notification && (
        <div
          className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in-right ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-xl`}></i>
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

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
          <table className="min-w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100 text-xs uppercase tracking-wide">
                <th className="w-[88px] py-2 font-semibold">Foto</th>
                <th className="w-[22rem] py-2 font-semibold">Nama & Deskripsi</th>
                <th className="w-44 py-2 pl-6 font-semibold">Kategori</th>
                <th className="w-32 py-2 pl-4 font-semibold">Harga</th>
                <th className="w-32 py-2 text-center font-semibold">Visibilitas</th>
                <th className="w-32 py-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleMenus.map((menu) => (
                <tr key={menu.id_menu} className="border-b border-slate-100">
                  <td className="py-4 pr-4 align-top">
                    <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden">
                      <img src={resolveMenuPhoto(menu)} alt={menu.nama_menu} className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="py-4 align-top pr-6">
                    <p className="font-semibold text-brand-dark leading-tight">{menu.nama_menu}</p>
                    {menu.deskripsi_menu && (
                      <p className="mt-2 whitespace-pre-line break-words text-xs text-slate-500 leading-relaxed">
                        {forceWrapText(menu.deskripsi_menu)}
                      </p>
                    )}
                  </td>
                  <td className="py-4 align-top pl-6 text-sm text-slate-600">
                    <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {menu.kategori?.nama_kategori ?? '-'}
                    </div>
                  </td>
                  <td className="py-4 align-top pl-4 text-brand-accent font-semibold">
                    {formatCurrency(menu.harga_menu)}
                  </td>
                  <td className="py-4 align-top text-center">
                    <ToggleSwitch
                      checked={menu.status_visibilitas}
                      onChange={() => handleToggle(menu)}
                      isLoading={togglingId === menu.id_menu}
                      disabled={togglingId === menu.id_menu}
                    />
                  </td>
                  <td className="py-4 align-top text-right space-x-3">
                    <button type="button" onClick={() => handleEdit(menu)} className="text-sm text-brand-accent font-semibold">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteClick(menu)} className="text-sm text-red-500 font-semibold">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && menus.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">
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
            <h3 className="text-2xl font-semibold text-brand-dark mb-2">{form.id_menu ? 'Ubah Menu' : 'Tambah Menu'}</h3>
            <p className="text-sm text-slate-500 mb-4">Lengkapi informasi menu. Perubahan langsung tersimpan di daftar menu setelah disubmit.</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Kategori
                <select
                  value={form.id_kategori}
                  onChange={(e) => setForm({ ...form, id_kategori: e.target.value })}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((category) => (
                    <option key={category.id_kategori} value={category.id_kategori}>
                      {category.nama_kategori}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Nama Menu
                <input
                  value={form.nama_menu}
                  onChange={(e) => setForm({ ...form, nama_menu: e.target.value })}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Deskripsi
                <textarea
                  value={form.deskripsi_menu}
                  onChange={(e) => setForm({ ...form, deskripsi_menu: e.target.value })}
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600 flex flex-col">
                Harga (Rp)
                <input
                  type="number"
                  value={form.harga_menu}
                  onChange={(e) => setForm({ ...form, harga_menu: e.target.value })}
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
                    setForm({ ...form, foto: file || undefined, foto_menu: '' });
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
                <ToggleSwitch checked={form.status_visibilitas} onChange={(checked) => setForm((prev) => ({ ...prev, status_visibilitas: checked }))} />
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
                  className="flex items-center gap-2 bg-brand-accent text-brand-dark font-semibold px-5 py-2 rounded-xl transition-colors duration-200 hover:bg-yellow-200 focus-visible:ring-2 focus-visible:ring-brand-accent/60 disabled:opacity-60"
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
                      {form.id_menu ? 'Simpan Perubahan' : 'Simpan'}
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
