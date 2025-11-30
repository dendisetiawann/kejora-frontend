import type { DraftItem } from '@/lib/checkoutDraft';
import type { Pesanan } from '@/types/entities';

export type OrderSuccessPayload = {
  orderId: number;
  orderCode: string;
  customerName: string;
  tableNumber: string;
  paymentMethod: 'cash' | 'qris';
  total: number;
  items: DraftItem[];
  customerNote?: string | null;
  snapToken?: string | null;
  message?: string | null;
  createdAt: string;
  paymentStatus?: Pesanan['status_pembayaran'];
  orderStatus?: Pesanan['status_pesanan'];
};

const ORDER_SUCCESS_KEY = 'kejora_order_success';

export const saveOrderSuccess = (payload: OrderSuccessPayload): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ORDER_SUCCESS_KEY, JSON.stringify(payload));
};

export const readOrderSuccess = (): OrderSuccessPayload | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(ORDER_SUCCESS_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as OrderSuccessPayload;
  } catch (error) {
    console.error('Gagal membaca order success payload', error);
    return null;
  }
};

export const clearOrderSuccess = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ORDER_SUCCESS_KEY);
};
