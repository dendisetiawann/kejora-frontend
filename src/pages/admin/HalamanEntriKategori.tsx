import { Dispatch, FormEvent, SetStateAction } from 'react';

type HalamanEntriKategoriProps = {
  namaKategori: string;
  error: string | null;
  saving: boolean;
  setNamaKategori: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const renderFormKategori = (modeTitle: string, props: HalamanEntriKategoriProps) => {
  const { namaKategori, error, saving, setNamaKategori, onClose, onSubmit } = props;

  return (
    <>
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold">{modeTitle}</p>
          <h2 className="text-2xl font-bold text-brand-dark mt-1">{namaKategori || 'Kategori Baru'}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-slate-100 text-slate-500 hover:text-brand-dark flex items-center justify-center"
          disabled={saving}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <label className="flex flex-col gap-2 text-sm font-semibold text-brand-dark/80">
          Nama Kategori
          <input
            type="text"
            value={namaKategori}
            onChange={(e) => setNamaKategori(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
            placeholder="Contoh: Coffee"
          />
        </label>

        <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 transition-colors"
            disabled={saving}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || !namaKategori.trim()}
            className="flex items-center gap-2 bg-brand-accent text-brand-dark font-semibold px-5 py-2.5 rounded-xl transition-colors duration-200 hover:bg-yellow-400 focus-visible:ring-2 focus-visible:ring-brand-accent/60 disabled:opacity-60 shadow-lg shadow-brand-accent/20"
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
                {modeTitle === 'Edit Kategori' ? 'Simpan Perubahan' : 'Simpan Kategori'}
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export const tampilHalamanTambahKategori = (props: HalamanEntriKategoriProps) => renderFormKategori('Tambah Kategori', props);
export const tampilHalamanEditKategori = (props: HalamanEntriKategoriProps) => renderFormKategori('Edit Kategori', props);

export default function HalamanEntriKategori(props: HalamanEntriKategoriProps & { isEditMode: boolean }) {
  const { isEditMode, ...rest } = props;
  return isEditMode ? tampilHalamanEditKategori(rest) : tampilHalamanTambahKategori(rest);
}
