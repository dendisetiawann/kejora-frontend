import { Dispatch, FormEvent, SetStateAction } from 'react';
import ToggleSwitch from '@/components/ToggleSwitch';
import { Kategori, Menu } from '@/types/entities';
import { resolveMenuPhoto } from '@/lib/menuPhoto';

export type MenuForm = {
  id_menu?: number | null;
  id_kategori: string;
  nama_menu: string;
  deskripsi_menu: string;
  harga_menu: string;
  foto_menu: string;
  foto?: File;
  status_visibilitas: boolean;
};

export const defaultMenuForm: MenuForm = {
  id_menu: null,
  id_kategori: '',
  nama_menu: '',
  deskripsi_menu: '',
  harga_menu: '',
  foto_menu: '',
  status_visibilitas: true,
};

type HalamanEntriMenuProps = {
  form: MenuForm;
  categories: Kategori[];
  error: string | null;
  saving: boolean;
  photoPreview: string | null;
  setForm: Dispatch<SetStateAction<MenuForm>>;
  setPhotoPreview: (value: string | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const renderFormMenu = (modeTitle: string, props: HalamanEntriMenuProps) => {
  const { form, categories, error, saving, photoPreview, setForm, setPhotoPreview, onClose, onSubmit } = props;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setForm((prev) => ({ ...prev, foto: file || undefined, foto_menu: file ? '' : prev.foto_menu }));
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    } else {
      setPhotoPreview(null);
    }
  };

  return (
    <>
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold">{modeTitle}</p>
          <h3 className="text-2xl font-bold text-brand-dark">{form.nama_menu || 'Menu Baru'}</h3>
        </div>
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center" type="button" disabled={saving}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-dark/80">
            Nama Menu
            <input
              type="text"
              value={form.nama_menu}
              onChange={(e) => setForm((prev) => ({ ...prev, nama_menu: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
              placeholder="Es Kopi Susu"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-dark/80">
            Kategori
            <select
              value={form.id_kategori}
              onChange={(e) => setForm((prev) => ({ ...prev, id_kategori: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id_kategori} value={category.id_kategori}>
                  {category.nama_kategori}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm font-semibold text-brand-dark/80">
          Deskripsi Menu
          <textarea
            value={form.deskripsi_menu}
            onChange={(e) => setForm((prev) => ({ ...prev, deskripsi_menu: e.target.value }))}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent min-h-[100px]"
            placeholder="Deskripsi singkat menu"
          />
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-dark/80">
            Harga Menu
            <input
              type="number"
              value={form.harga_menu}
              onChange={(e) => setForm((prev) => ({ ...prev, harga_menu: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
              placeholder="25000"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-dark/80">
            Status Visibilitas
            <div className="flex items-center gap-3">
              <ToggleSwitch checked={form.status_visibilitas} onChange={() => setForm((prev) => ({ ...prev, status_visibilitas: !prev.status_visibilitas }))} />
              <span className="text-sm font-medium text-slate-500">{form.status_visibilitas ? 'Tampil ke pelanggan' : 'Sembunyikan'}</span>
            </div>
          </label>
        </div>
        <label className="flex flex-col gap-2 text-sm font-semibold text-brand-dark/80">
          Foto Menu
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
            <div className="aspect-square rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-slate-400 text-sm">
                  <i className="fas fa-image text-2xl mb-2"></i>
                  <p>Pratinjau Foto</p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input type="file" accept="image/*" onChange={handleFileChange} className="rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent" />
              <p className="text-xs text-slate-400">Format: JPG, PNG. Maksimal 10MB.</p>
            </div>
          </div>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500" disabled={saving}>
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-accent text-brand-dark font-semibold px-5 py-2 rounded-xl focus-visible:ring-2 focus-visible:ring-brand-accent/60 disabled:opacity-60"
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
                {modeTitle === 'Edit Menu' ? 'Simpan Perubahan' : 'Simpan'}
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export const tampilHalamanTambahMenu = (props: HalamanEntriMenuProps) => renderFormMenu('Tambah Menu', props);
export const tampilHalamanEditMenu = (props: HalamanEntriMenuProps) => renderFormMenu('Edit Menu', props);

export default function HalamanEntriMenu(props: HalamanEntriMenuProps) {
  return props.form.id_menu ? tampilHalamanEditMenu(props) : tampilHalamanTambahMenu(props);
}
