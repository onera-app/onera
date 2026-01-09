import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { login, signup } from '@/lib/api/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

export function AuthPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = isLogin
        ? await login({ email: form.email, password: form.password })
        : await signup(form);

      setAuth(response.token, response.user);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully');
      navigate({ to: '/' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Cortex
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              E2EE AI Chat
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
              />
            )}

            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={8}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Security note */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Your data is end-to-end encrypted. Only you can read your chats.
        </p>
      </div>
    </div>
  );
}
