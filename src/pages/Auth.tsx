import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Phone,
  Smartphone,
  Instagram,
  Facebook,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function Auth() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      toast({
        title: 'Validation Error',
        description: 'Email and password are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const success = await login(loginEmail, loginPassword);

      if (success) {
        toast({
          title: 'Welcome back 👋',
          description: 'Login successful',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Server Error',
        description: 'Something went wrong. Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const channels = [
    { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-500' },
    { icon: Phone, label: 'SMS', color: 'text-blue-500' },
    { icon: Smartphone, label: 'RCS', color: 'text-purple-500' },
    { icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
    { icon: Facebook, label: 'Facebook', color: 'text-blue-600' },
  ];

  return (
    <div className="min-h-screen flex">

      {/* LEFT SECTION */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo.png" className="w-12 h-12 rounded-xl" />
            <span className="text-2xl font-bold">Cell24x7</span>
          </div>

          <h1 className="text-4xl font-bold mb-6">
            All your customer conversations in{' '}
            <span className="text-primary">one place</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-10">
            Campaigns, automations and conversations in one platform.
          </p>

          <div className="flex gap-6">
            {channels.map((c) => (
              <div key={c.label} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-white shadow flex items-center justify-center">
                  <c.icon className={`w-6 h-6 ${c.color}`} />
                </div>
                <p className="text-xs mt-2 text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2026 Cell24x7. All rights reserved.
        </p>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md border border-gray-200 rounded-xl shadow-lg p-8 bg-white">

          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <img src="/logo.png" className="w-10 h-10 rounded-xl" />
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Welcome Back 👋</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Login to your Cell24x7 dashboard
            </p>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            {/* Password with Show / Hide */}
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {/* {showPassword ? <EyeOff size={18} /> : <Eye size={18} />} */}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v as boolean)}
                />
                <span className="text-sm">Remember me</span>
              </div>

              <a href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <a className="text-primary underline">Terms</a> &{' '}
            <a className="text-primary underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
