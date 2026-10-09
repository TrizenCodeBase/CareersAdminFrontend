import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { API_CONFIG } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      {/* Page-level branding above the card */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trizen Careers</h1>
        <p className="mt-1 text-sm text-gray-500">Admin Panel</p>
      </div>

      <Card className="w-full max-w-md shadow-lg border border-gray-100 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-primary" />

        <CardHeader className="space-y-1 pt-6 pb-4 px-6">
          <CardTitle className="text-xl font-semibold text-center text-gray-900">
            Sign in to your account
          </CardTitle>
          <CardDescription className="text-center text-gray-500 text-sm">
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
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
                className="h-10 focus-visible:ring-primary"
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
                className="h-10 focus-visible:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold tracking-wide mt-1"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
