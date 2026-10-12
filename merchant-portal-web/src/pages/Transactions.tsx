import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { getTransactionsByMerchant, type Transaction } from '../api/transactions';
import api from '../api/client';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

type MerchantLite = { id: string; name: string };

export default function Transactions() {
  const [merchants, setMerchants] = useState<MerchantLite[]>([]);
  const [merchantId, setMerchantId] = useState<string>('');
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation() as { state?: { merchantId?: string } };
  const initialFromNav = location?.state?.merchantId;
  // Load merchants
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get('/merchants/mine');
        const payload = resp?.data;

        // Normalize to an array: supports `[...]` and `{ data: [...] }`
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : [];

        // Normalize id to string in case backend returns numbers
        const normalized: MerchantLite[] = list.map((m: any) => ({
          id: String(m.id),
          name: m.name,
        }));

        setMerchants(normalized);
        
        if (initialFromNav) {
              setMerchantId(String(initialFromNav));
            } else if (normalized[0]?.id) {
              setMerchantId(normalized[0].id);
            }

      } catch (e) {
        console.error('Failed to load merchants', e);
        setMerchants([]);
        setMerchantId('');
      }
    })();
  }, [initialFromNav]);

  // Load transactions for selected merchant
  useEffect(() => {
    (async () => {
      if (!merchantId) return;
      setLoading(true);
      try {
        const txns = await getTransactionsByMerchant(merchantId);
        setRows(Array.isArray(txns) ? txns : []);
      } catch (e) {
        console.error('Failed to load transactions', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [merchantId]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Transactions</h2>
            <p className="text-sm text-gray-500">
              All payments recorded for the selected merchant
            </p>
          </div>
          <Link to="/transactions/new">
            <Button>Record Transaction</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">Merchant</div>
              <select
                className="rounded-md border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
              >
                {merchants.length === 0 ? (
                  <option value="" disabled>
                    {loading ? 'Loading merchants…' : 'No merchants found'}
                  </option>
                ) : (
                  merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="py-8 flex items-center gap-2">
                <Spinner /> <span>Loading...</span>
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                subtitle="Record your first transaction to see it here."
                cta={
                  <Link to="/transactions/new">
                    <Button>Record Transaction</Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Currency</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3">
                          {t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-3">{t.customer?.name || t.customerId}</td>
                        <td className="py-3 font-medium">
                          {typeof t.amount === 'number' ? t.amount.toFixed(2) : '—'}
                        </td>
                        <td className="py-3">{t.currency}</td>
                        <td className="py-3 text-gray-500">
                          {t.status ? t.status : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
