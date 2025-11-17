export type DraftItem = {
  menu_id: number;
  name: string;
  price: number;
  qty: number;
  note?: string;
};

export type CheckoutDraft = {
  customerName: string;
  tableNumber: string;
  items: DraftItem[];
  createdAt: string;
  paymentMethod?: 'cash' | 'qris';
  orderNote?: string;
};

const CHECKOUT_DRAFT_KEY = 'kejora_checkout_draft';

export const saveCheckoutDraft = (draft: CheckoutDraft): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
};

export const readCheckoutDraft = (): CheckoutDraft | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as CheckoutDraft;
  } catch (error) {
    console.error('Gagal membaca checkout draft', error);
    return null;
  }
};

export const clearCheckoutDraft = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
};

export const checkoutDraftKey = CHECKOUT_DRAFT_KEY;
