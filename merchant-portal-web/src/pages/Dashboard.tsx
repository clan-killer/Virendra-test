import { useEffect, useState, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtime } from '../realtime/useRealtime';

type Merchant = {
  id: string;
  name: string;
  legalName?: string | null;
  createdAt?: string;
  // you can add more fields as needed
};

type AiQueryResult = {
  cypher: string;
  rows: any[];
};

export default function Dashboard() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  // --- AI query state ---
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiQueryResult | null>(null);

  // Initial fetch (from DB)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/merchants/mine');
        // If backend doesn't sort, sort by createdAt desc (optional)
        const normalized: Merchant[] = Array.isArray(data) ? data : [];
        normalized.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        setMerchants(normalized);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch merchants', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🔴 Realtime handler: prepend + dedupe by id, keep newest first
  const handleMerchantCreated = useCallback((m: Merchant) => {
    // eslint-disable-next-line no-console
    console.log('[UI] merchantCreated received:', m);
    setMerchants(prev => {
      const exists = prev.some(x => x.id === m.id);
      const createdAt = m.createdAt ?? new Date().toISOString();
      const next = exists
        ? [m, ...prev.filter(x => x.id !== m.id)]
        : [{ ...m, createdAt }, ...prev];

      // Sort again by createdAt desc (in case out-of-order delivery)
      next.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      return next;
    });
  }, []);

  // ✅ Subscribe to real-time events
  useRealtime({
    onMerchantCreated: handleMerchantCreated,
    // onCustomerCreated: (c) => { /* optional: handle customers live */ }
  });

  const handleAiQuery = async () => {
    if (!aiQuestion.trim()) return;

    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const { data } = await api.post('/ai/query', { question: aiQuestion });
      setAiResult(data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong while running AI query';
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Dashboard</h2>
            <p className="text-sm text-gray-500">Overview of your merchants</p>
          </div>
          <Link to="/register-merchant">
            <Button>
              <Store className="h-4 w-4 mr-2" /> Register Merchant
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="text-sm text-gray-500">Total Merchants</div>
            </CardHeader>
            <CardBody>
              <div className="text-3xl font-semibold">{merchants.length}</div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-sm text-gray-500">Active</div>
            </CardHeader>
            <CardBody>
              <div className="text-3xl font-semibold">{merchants.length}</div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-sm text-gray-500">Last Created</div>
            </CardHeader>
            <CardBody>
              <div className="text-xl font-medium">
                {merchants[0]?.name ?? '—'}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 🔍 AI Query Box */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Ask your data (AI)</h3>
                <p className="text-sm text-gray-500">
                  Type a natural language question about your merchants, customers, or transactions.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <textarea
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder='e.g. "Show all transactions above 10000" or "List all merchants"'
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
              />

              <div className="flex items-center gap-3">
                <Button onClick={handleAiQuery} disabled={aiLoading || !aiQuestion.trim()}>
                  {aiLoading ? 'Running...' : 'Run AI Query'}
                </Button>
                {aiError && <span className="text-sm text-red-500">{aiError}</span>}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Results
                </h4>

                {aiResult && aiResult.rows.length > 0 ? (
                  <div className="mt-1 text-sm bg-gray-100 dark:bg-gray-900 rounded-md p-2">
                    {(() => {
                      const firstRow = aiResult.rows[0];

                      // CASE 1: Merchant nodes => { m: Node }
                      if (firstRow.m) {
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {aiResult.rows.map((row: any, index: number) => {
                              const merchantNode = row.m;
                              const name = merchantNode?.properties?.name;
                              const legalName = merchantNode?.properties?.legalName;

                              if (!merchantNode || !name) {
                                return (
                                  <li key={index} className="text-xs text-gray-600">
                                    {JSON.stringify(row)}
                                  </li>
                                );
                              }

                              return (
                                <li key={index}>
                                  <span className="font-medium">{name}</span>
                                  {legalName && (
                                    <span className="text-gray-500 text-xs">
                                      {' '}
                                      — {legalName}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        );
                      }

                      // CASE 2: Customer nodes => { c: Node }
                      if (firstRow.c) {
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {aiResult.rows.map((row: any, index: number) => {
                              const customerNode = row.c;
                              const name = customerNode?.properties?.name;
                              const email = customerNode?.properties?.email;

                              if (!customerNode || !name) {
                                return (
                                  <li key={index} className="text-xs text-gray-600">
                                    {JSON.stringify(row)}
                                  </li>
                                );
                              }

                              return (
                                <li key={index}>
                                  <span className="font-medium">{name}</span>
                                  {email && (
                                    <span className="text-gray-500 text-xs">
                                      {' '}
                                      — {email}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        );
                      }

                      // CASE 3: Transaction nodes => { t: Node }
                      if (firstRow.t) {
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {aiResult.rows.map((row: any, index: number) => {
                              const txNode = row.t;
                              const props = txNode?.properties || {};
                              const amount = props.amountMinor;
                              const currency = props.currency;
                              const status = props.status;

                              if (!txNode) {
                                return (
                                  <li key={index} className="text-xs text-gray-600">
                                    {JSON.stringify(row)}
                                  </li>
                                );
                              }

                              return (
                                <li key={index}>
                                  <span className="font-medium">
                                    {amount} {currency}
                                  </span>
                                  {status && (
                                    <span className="text-gray-500 text-xs">
                                      {' '}
                                      — {status}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        );
                      }

                      // CASE 4: Aggregated totals per merchant => { merchant, totalAmount }
                      if (
                        Object.prototype.hasOwnProperty.call(firstRow, 'merchant') &&
                        Object.prototype.hasOwnProperty.call(firstRow, 'totalAmount')
                      ) {
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {aiResult.rows.map((row: any, index: number) => (
                              <li key={index}>
                                <span className="font-medium">{row.merchant}</span>
                                <span className="text-gray-500 text-xs">
                                  {' '}
                                  — Total: {row.totalAmount}
                                </span>
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      // FALLBACK: Unknown shape -> show raw JSON
                      return (
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(aiResult.rows, null, 2)}
                        </pre>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No results.</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Merchants list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">My Merchants</h3>
                <p className="text-sm text-gray-500">
                  Recently created appear first
                </p>
              </div>
              <Link to="/register-merchant">
                <Button variant="secondary">Add New</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="py-8 flex items-center gap-2">
                <Spinner /> <span>Loading...</span>
              </div>
            ) : merchants.length === 0 ? (
              <EmptyState
                title="No merchants yet"
                subtitle="Create your first merchant to get started."
                cta={
                  <Link to="/register-merchant">
                    <Button>Register Merchant</Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="pb-6">Name</th>
                      <th className="pb-6">Legal Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {merchants.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-6 font-medium">{m.name}</td>
                        <td className="py-6">{m.legalName ?? '—'}</td>
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