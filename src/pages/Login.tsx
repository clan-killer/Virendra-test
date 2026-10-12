// src/pages/Login.tsx
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';

const schemaLogin = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});
const schemaRegister = schemaLogin.extend({
  name: z.string().min(2, 'Enter your name'),
});

type LoginForm = z.infer<typeof schemaLogin>;
type RegisterForm = z.infer<typeof schemaRegister>;

export default function Login() {
  const { token, login, register: registerUser } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const submittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginForm | RegisterForm>({
    resolver: zodResolver(mode === 'login' ? schemaLogin : schemaRegister),
  });

  // If already logged in, go to dashboard
  useEffect(() => {
    if (token || localStorage.getItem('access_token')) {
      nav('/dashboard', { replace: true });
    }
  }, [token, nav]);

  const onSubmit = async (values: any) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      if (mode === 'login') {
        await login(values.email, values.password);
        toast.success('Welcome back!');
      } else {
        await registerUser(values.name, values.email, values.password);
        toast.success('Account created');
      }

      // Navigate after the context has updated (AuthContext.login awaits a microtask)
      nav('/dashboard', { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Something went wrong');
    } finally {
      submittingRef.current = false;
    }
  };

  // Reset fields when switching modes
  useEffect(() => {
    reset({});
  }, [mode, reset]);

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Toaster position="top-right" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold">
            {mode === 'login' ? 'Sign in' : 'Create an account'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Merchant Admin Portal</p>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
            {mode === 'register' && (
              <Input
                label="Name"
                type="text"
                placeholder="Your name"
                {...register('name' as any)}
                error={(errors as any).name?.message as string | undefined}
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              {...register('email' as any)}
              error={(errors as any).email?.message as string | undefined}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password' as any)}
              error={(errors as any).password?.message as string | undefined}
            />

            {/* IMPORTANT: ensure 'submit' type */}
            <Button className="w-full" loading={isSubmitting} type="submit">
              {mode === 'login' ? 'Sign in' : 'Register'}
            </Button>
          </form>

          <div className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
            {mode === 'login' ? (
              <>
                Don’t have an account?{' '}
                <button className="text-brand underline" onClick={() => setMode('register')}>
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="text-brand underline" onClick={() => setMode('login')}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}