/* eslint-disable @next/next/no-img-element */
import { Menu } from '@/types/entities';
import { formatCurrency } from '@/lib/format';
import { resolveMenuPhoto } from '@/lib/menuPhoto';

export interface HalamanDetailMenuProps {
  menu: Menu;
  qty: number;
  onQtyChange: (qty: number) => void;
  onClose: () => void;
  onAddToCart: () => void;
}

const tampilHalamanDetailMenu = ({
  menu,
  qty,
  onQtyChange,
  onClose,
  onAddToCart,
}: HalamanDetailMenuProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="relative h-64 bg-gray-100">
        <img
          src={menu.foto_menu ? resolveMenuPhoto(menu) : `https://picsum.photos/seed/kejora-${menu.id_menu}/600/400`}
          alt={menu.nama_menu}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="p-6 flex flex-col flex-1 overflow-y-auto">
        <div className="mb-4">
          <span className="text-xs font-bold tracking-wider text-brand-accent uppercase mb-1 block">
            {menu.kategori?.nama_kategori ?? 'Menu'}
          </span>
          <h3 className="text-2xl font-bold text-brand-dark mb-2">{menu.nama_menu}</h3>
          <p className="text-xl font-semibold text-brand-DEFAULT">{formatCurrency(menu.harga_menu)}</p>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          {menu.deskripsi_menu ?? 'Deskripsi menu akan segera diperbarui.'}
        </p>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <span className="text-sm font-medium text-gray-700">Jumlah Pesanan</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onQtyChange(Math.max(1, qty - 1))}
                className="h-10 w-10 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-brand-dark hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="fas fa-minus text-sm"></i>
              </button>
              <span className="w-8 text-center font-bold text-xl text-brand-dark">{qty}</span>
              <button
                type="button"
                onClick={() => onQtyChange(qty + 1)}
                className="h-10 w-10 rounded-lg flex items-center justify-center bg-brand-dark text-white hover:bg-brand-DEFAULT transition-colors shadow-sm"
              >
                <i className="fas fa-plus text-sm"></i>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddToCart}
            className="w-full bg-brand-dark text-white font-bold py-3.5 rounded-xl hover:bg-brand-DEFAULT transition-colors shadow-lg"
          >
            Tambah ke Keranjang - {formatCurrency(menu.harga_menu * qty)}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export { tampilHalamanDetailMenu };

export default function HalamanDetailMenu(props: HalamanDetailMenuProps) {
  return tampilHalamanDetailMenu(props);
}
