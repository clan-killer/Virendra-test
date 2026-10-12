
import api from './client';
export type Transaction = {
  id: string;
  createdAt?: string;
  currency: string;
  amount: number | null; // major units if available (e.g., rupees), null if not present
  status?: string;
  customerId?: string;
  customer?: { id: string; name?: string; email?: string; phone?: string };
  metadata?: { source?: string; items?: number };
};

export async function getTransactionsByMerchant(merchantId: string): Promise<Transaction[]> {
  // Adjust the endpoint to match your backend. From your sample, it looks like /transactions/:id
  // If it is actually a query param, switch to `/transactions?merchantId=${merchantId}`
  const resp = await api.get(`/transactions/${encodeURIComponent(merchantId)}`);
  const payload = resp?.data;

  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
    ? payload.items
    : [];

  const normalized: Transaction[] = rawList.map((row: any) => {
    const tx = row?.transaction ?? {};
    const cust = row?.customer ?? {};
    // If amountMinor is in paise/cents, convert to rupees/dollars
    const amount =
      typeof tx.amountMinor === 'number'
        ? tx.amountMinor / 100
        : tx.amount != null && typeof tx.amount === 'number'
        ? tx.amount
        : null;

    return {
      id: String(tx.id),
      createdAt: tx.createdAt,
      currency: tx.currency,
      amount,
      status: tx.status,
      customerId: cust?.id ? String(cust.id) : undefined,
      customer: cust?.id
        ? {
            id: String(cust.id),
            name: cust.name,
            email: cust.email,
            phone: cust.phone,
          }
        : undefined,
      // If you want to surface "description" as "source" in Notes:
      metadata: tx.description ? { source: tx.description } : undefined,
    };
  });

  // Optional: sort newest first, so the latest shows up top
  normalized.sort((a, b) => {
    const ta = a.createdAt ? +new Date(a.createdAt) : 0;
    const tb = b.createdAt ? +new Date(b.createdAt) : 0;
    return tb - ta;
  });

  return normalized;
}

export async function createTransaction(input: {
  merchantId: string;
  customerId: string;
  amount: number; // major units (e.g., rupees)
  currency: string;
  metadata?: { items?: number; source?: string };
}) {
  const resp = await api.post('/transactions', input);
  return resp?.data;
}
