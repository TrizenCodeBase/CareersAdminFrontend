import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { API_CONFIG } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.USERS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.data.user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }

      login(data.data.token, data.data.user);
      const returnTo = (location.state as { from?: unknown } | null)?.from;
      navigate(
        typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
          ? returnTo
          : '/dashboard',
        { replace: true }
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#03045E] to-[#0077B6] px-4 overflow-hidden">

      {/* Animated blurred circle decorators */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#DAF5FB]/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-[#0077B6]/30 blur-3xl animate-[pulse_8s_ease-in-out_2s_infinite]" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-64 w-64 rounded-full bg-[#DAF5FB]/10 blur-2xl animate-[pulse_7s_ease-in-out_1s_infinite]" />

      {/* Branding above the card */}
      <div className="relative mb-8 text-center flex flex-col items-center">
        {/* Large logo */}
        <div className="mb-4 h-16 w-16 rounded-2xl bg-white ring-2 ring-white/30 flex items-center justify-center shadow-xl backdrop-blur-sm overflow-hidden p-2">
          <img src="https://community.trizenventures.com/assets/trizen-mark-DU5BltTz.png" alt="Trizen Logo" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Trizen Careers</h1>
        <p className="mt-1 text-sm text-blue-200">Admin Panel</p>
      </div>

      {/* Login card */}
      <Card className="relative w-full max-w-md bg-white shadow-2xl border-0 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#03045E] to-[#0077B6]" />

        <CardHeader className="space-y-1 pt-7 pb-4 px-6">
          <CardTitle className="text-xl font-semibold text-center text-gray-900">
            Sign in to your account
          </CardTitle>
          <CardDescription className="text-center text-gray-500 text-sm">
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 border-l-4 border-l-red-500 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                disabled={loading}
                className="h-10 focus-visible:ring-[#03045E]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                disabled={loading}
                className="h-10 focus-visible:ring-[#03045E]"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold tracking-wide mt-1 bg-[#03045E] hover:bg-[#0077B6] transition-colors duration-200"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
