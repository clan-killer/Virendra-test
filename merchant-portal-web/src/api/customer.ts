
import api from './client';

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt?: string;
};

export type CreateCustomerInput = {
  name: string;
  email?: string;
  phone?: string;
};

export async function createCustomer(payload: CreateCustomerInput): Promise<Customer> {
  const { data } = await api.post('/customers', payload);
  return data;
}

export async function searchCustomers(q: string): Promise<Customer[]> {
  
  const query = q.trim();
  if (query.length < 2) return []; // UX: wait for 2+ chars
  const resp = await api.get('/customers', { params: { q: query } });

  // Normalize shape: accept either array or { data: [...] }
  if (Array.isArray(resp.data)) return resp.data as Customer[];
  if (Array.isArray(resp.data?.data)) return resp.data.data as Customer[];
  return [];

}

