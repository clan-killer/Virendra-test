import AppLayout from '../components/layout/AppLayout';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { Toaster, toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  name: z.string().min(2, 'Enter a valid display name'),
  legalName: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function MerchantRegistration() {
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    try {
      await api.post('/merchants', values);
      toast.success('Merchant created');
      nav('/dashboard');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error creating merchant');
    }
  };

  return (
    <AppLayout>
      <Toaster position="top-right" />
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Register Merchant</h2>
            <p className="text-sm text-gray-500">Create a merchant profile to manage loyalty & transactions.</p>
          </CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input label="Display Name" placeholder="Cafe Aurora" {...register('name')} error={errors.name?.message} />
              <Input label="Legal Name (optional)" placeholder="Cafe Aurora Pvt Ltd" {...register('legalName')} error={errors.legalName?.message} />
              <div className="flex justify-end">
                <Button loading={isSubmitting}>Create Merchant</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  );
}
