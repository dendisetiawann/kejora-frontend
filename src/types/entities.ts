export interface Pengguna {
  id_pengguna: number;
  nama_pengguna: string;
  username: string;
  tanggal_dibuat?: string;
  tanggal_diubah?: string;
}

export interface Kategori {
  id_kategori: number;
  nama_kategori: string;
  jumlah_menu?: number;
  tanggal_dibuat?: string;
  tanggal_diubah?: string;
}

export interface Menu {
  id_menu: number;
  id_kategori: number;
  nama_menu: string;
  deskripsi_menu?: string | null;
  harga_menu: number;
  foto_menu?: string | null;
  status_visibilitas: boolean;
  tanggal_dibuat?: string;
  tanggal_diubah?: string;
  kategori?: Kategori;
}

export interface Pelanggan {
  id_pelanggan: number;
  nama_pelanggan: string;
  nomor_meja: string | null;
  catatan_pelanggan?: string | null;
}

export interface ItemPesanan {
  id_itempesanan: number;
  id_pesanan: number;
  id_menu: number;
  quantity: number;
  harga_itempesanan: number;
  subtotal: number;
  tanggal_dibuat?: string;
  tanggal_diubah?: string;
  menu?: Menu;
}

export interface Pesanan {
  id_pesanan: number;
  nomor_pesanan?: string;
  pelanggan?: Pelanggan | null;
  nama_pelanggan?: string | null;
  nomor_meja?: string | null;
  catatan_pelanggan?: string | null;
  total_harga: number;
  metode_pembayaran: 'cash' | 'qris';
  status_pembayaran: 'belum_bayar' | 'pending' | 'dibayar' | 'gagal';
  status_pesanan: 'baru' | 'diproses' | 'selesai' | 'batal';
  token_pembayaran?: string | null;
  id_transaksi_qris?: string | null;
  tanggal_dibuat?: string;
  tanggal_diubah?: string;
  items?: ItemPesanan[];
}

// Backward compatibility aliases
export type User = Pengguna;
export type Category = Kategori;
export type OrderItem = ItemPesanan;
export type Order = Pesanan;

