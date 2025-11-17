export interface User {
  id: number;
  name: string;
  username: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Menu {
  id: number;
  category_id: number;
  name: string;
  description?: string | null;
  price: number;
  photo_path?: string | null;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
  category?: Category;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_id: number;
  qty: number;
  price: number;
  subtotal: number;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
  menu?: Menu;
}

export interface Order {
  id: number;
  customer_name: string;
  table_number: string;
  customer_note?: string | null;
  total_amount: number;
  payment_method: 'cash' | 'qris';
  payment_status: 'belum_bayar' | 'pending' | 'dibayar' | 'gagal';
  order_status: 'baru' | 'diproses' | 'selesai';
  snap_token?: string | null;
  midtrans_order_id?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
}

