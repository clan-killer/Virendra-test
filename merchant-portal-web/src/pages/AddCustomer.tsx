import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomer } from '../api/customer';
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  name: z.string().min(2, 'Enter a valid name'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AddCustomer() {
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '' }
  });

  const onSubmit = async (values: FormData) => {
    const payload = { ...values, email: values.email || undefined };
    try {
      const c = await createCustomer(payload);
      toast.success(`Customer created: ${c.name}`);
      nav('/transactions/new'); // go to record transaction next
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create customer');
    }
  };

  return (
    <AppLayout>
      <Toaster position="top-right" />
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Add Customer</h2>
            <p className="text-sm text-gray-500">Create a customer profile to attach transactions.</p>
          </CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Full Name" placeholder="John Doe" {...register('name')} error={errors.name?.message} />
              <Input label="Email (optional)" placeholder="john@example.com" type="email" {...register('email')} error={errors.email?.message} />
              <Input label="Phone (optional)" placeholder="+91 99999 00000" {...register('phone')} error={errors.phone?.message} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => nav(-1)} type="button">Cancel</Button>
                <Button loading={isSubmitting}>Create Customer</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
