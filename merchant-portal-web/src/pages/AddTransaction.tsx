import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTransaction } from '../api/transactions';
import { searchCustomers, type Customer } from '../api/customer';
import { Toaster, toast } from 'react-hot-toast';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  merchantId: z.string().min(1, 'Merchant is required'),
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.number().positive('Amount must be greater than 0'), // ⬅️ no coerce
  currency: z.string().min(1, 'Currency is required'),
  metadata_items: z.number().int().nonnegative().optional(),    // ⬅️ no coerce
  metadata_source: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type MerchantLite = { id: string; name: string };

export default function AddTransaction() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      merchantId: '',
      customerId: '',
      amount: 0,
      currency: 'INR',
      metadata_items: undefined, // optional → undefined by default
      metadata_source: '',
    },
  });

  const [myMerchants, setMyMerchants] = useState<MerchantLite[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const selectedCustomerId = watch('customerId');
  const navigate = useNavigate();

  // Load current user's merchants
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<MerchantLite[]>('/merchants/mine');
        setMyMerchants(data || []);
        if (data?.[0]?.id) setValue('merchantId', data[0].id, { shouldValidate: true });
      } catch {
        // ignore silently
      }
    })();
  }, [setValue]);

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2) {
        setResults([]);
        setLoadingSearch(false);
        return;
      }
      try {
        setLoadingSearch(true);
        const res = await searchCustomers(q);
        setResults(Array.isArray(res) ? res.slice(0, 10) : []);
      } catch {
        setResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const selectedCustomer = useMemo(
    () => results.find((r) => r.id === selectedCustomerId),
    [results, selectedCustomerId]
  );

  const onSubmit = async (values: FormData) => {
    // Defense-in-depth guards (besides Zod)
    if (!values.customerId) {
      toast.error('Please select a customer before recording the transaction');
      return;
    }
    if (!values.merchantId) {
      toast.error('Please select a merchant');
      return;
    }

    const payload = {
      merchantId: values.merchantId,
      customerId: values.customerId,
      amount: values.amount,
      amountMinor: Math.round(values.amount * 100),
      currency: values.currency,
      metadata: {
        ...(values.metadata_items != null ? { items: values.metadata_items } : {}),
        ...(values.metadata_source ? { source: values.metadata_source } : {}),
      },
    };

    try {
      await createTransaction(payload);
      toast.success('Transaction recorded');

      // If your route is singular, change to '/transaction'
      navigate('/transactions', { state: { merchantId: values.merchantId } });

      // Keep current merchant & customer; clear amount & metadata
      reset({
        merchantId: values.merchantId,
        customerId: values.customerId,
        amount: 0,
        currency: values.currency,
        metadata_items: undefined,
        metadata_source: '',
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to record transaction');
    }
  };

  const isSubmitDisabled = isSubmitting || !selectedCustomerId || !isValid;

  return (
    <AppLayout>
      <Toaster position="top-right" />
      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Record Transaction</h2>
            <p className="text-sm text-gray-500">Link a customer to a merchant by recording a payment.</p>
          </CardHeader>

          <CardBody>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Merchant select */}
              <label className="block">
                <div className="mb-1 text-sm font-medium">Merchant</div>
                <select
                  className="w-full rounded-md border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
                  aria-invalid={!!errors.merchantId}
                  aria-describedby={errors.merchantId ? 'merchantId-error' : undefined}
                  {...register('merchantId')}
                >
                  {myMerchants.length === 0 && <option value="">—</option>}
                  {myMerchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {errors.merchantId && (
                  <p id="merchantId-error" className="text-sm text-red-600 mt-1">
                    {errors.merchantId.message}
                  </p>
                )}
              </label>

              {/* Customer search + pick */}
              <div>
                <div className="mb-1 text-sm font-medium">Customer</div>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name/email/phone"
                    className="flex-1 rounded-md border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
                    aria-label="Search customers"
                  />
                  <button
                    type="button"
                    className="rounded-md px-3 py-2 border border-gray-300 dark:border-gray-700"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                    }}
                  >
                    Clear
                  </button>
                </div>

                {/* Suggestions */}
                {query.trim().length >= 2 && (
                  <div className="mt-2">
                    {loadingSearch ? (
                      <div className="text-sm text-gray-500">Searching…</div>
                    ) : results.length > 0 ? (
                      <div className="max-h-48 overflow-auto rounded-md border border-gray-200 dark:border-gray-800 divide-y">
                        {results.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setValue('customerId', r.id, { shouldValidate: true, shouldDirty: true });
                              setQuery(r.name || r.email || r.phone || r.id);
                              setResults([]);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              r.id === selectedCustomerId ? 'bg-gray-100 dark:bg-gray-800' : ''
                            }`}
                          >
                            <div className="font-medium">{r.name || r.email || r.phone || r.id}</div>
                            <div className="text-xs text-gray-500">
                              {(r.email || '—') + ' · ' + (r.phone || '—')}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No results</div>
                    )}
                  </div>
                )}

                {/* Hidden field to actually submit the chosen customer */}
                <input type="hidden" {...register('customerId')} />
                {errors.customerId && (
                  <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>
                )}

                {selectedCustomerId && selectedCustomer && (
                  <p className="text-xs text-green-700 mt-2">
                    Selected: {selectedCustomer.name || selectedCustomer.email || selectedCustomer.phone}
                  </p>
                )}
              </div>

              {/* Amount & currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? 'amount-error' : undefined}
                  // 👇 RHF parses the numeric value for us
                  {...register('amount', { valueAsNumber: true })}
                  error={errors.amount?.message}
                />
                <label className="block md:col-span-2 md:max-w-xs">
                  <div className="mb-1 text-sm font-medium">Currency</div>
                  <select
                    className="w-full rounded-md border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-brand"
                    aria-invalid={!!errors.currency}
                    aria-describedby={errors.currency ? 'currency-error' : undefined}
                    {...register('currency')}
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  {errors.currency && (
                    <p id="currency-error" className="text-sm text-red-600 mt-1">
                      {errors.currency.message}
                    </p>
                  )}
                </label>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Items (optional)"
                  type="number"
                  // 👇 parse as number; empty → NaN (which will be removed by optional if you handle setValueAs)
                  {...register('metadata_items', {
                    setValueAs: (v) => {
                      if (v === '' || v == null) return undefined;
                      const n = Number(v);
                      return Number.isNaN(n) ? undefined : n;
                    },
                  })}
                />
                <Input label="Source (optional)" placeholder="POS / Web / App" {...register('metadata_source')} />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="secondary" type="button" onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting} disabled={isSubmitDisabled}>
                  Record
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}