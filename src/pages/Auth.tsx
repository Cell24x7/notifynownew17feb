import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Smartphone, Instagram, Facebook, Loader2 } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, signup, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupCompany, setSignupCompany] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupEmailError, setSignupEmailError] = useState('');

  if (isAuthenticated) {
    if (user?.role === 'admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLoginEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setLoginEmail(email);
    if (!email) {
      setLoginEmailError('Email is required');
    } else if (!validateEmail(email)) {
      setLoginEmailError('Please enter a valid email address');
    } else {
      setLoginEmailError('');
    }
  };

  const handleLoginPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setLoginPassword(password);
    if (!password) {
      setLoginPasswordError('Password is required');
    } else {
      setLoginPasswordError('');
    }
  };

  const handleSignupEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setSignupEmail(email);
    if (!email) {
      setSignupEmailError('Email is required');
    } else if (!validateEmail(email)) {
      setSignupEmailError('Please enter a valid email address');
    } else {
      setSignupEmailError('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginEmailError || loginPasswordError) return;

    if (!loginEmail || !loginPassword) {
      if (!loginEmail) setLoginEmailError('Email is required');
      if (!loginPassword) setLoginPasswordError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const success = await login(loginEmail, loginPassword);
      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
        const token = localStorage.getItem('authToken');
        if (token) {
          const decoded: any = jwtDecode(token);
          if (decoded.role === 'admin') {
            navigate('/super-admin/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    if (signupEmailError) return;

    setLoading(true);

    try {
      const success = await signup(signupName, signupCompany, signupEmail, signupPassword);
      if (success) {
        toast({
          title: 'Account created!',
          description: 'Welcome to Cell24x7.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Signup failed',
          description: 'Please check your details',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Something went wrong',
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
      {/* Left Section - same as before */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo.png" alt="Cell24x7" className="w-12 h-12 rounded-xl shadow-lg" />
            <span className="text-2xl font-bold">Cell24x7</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-6">
            All your customer conversations in{' '}
            <span className="text-primary">one place</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            All your customer conversations, campaigns, automations, and integrations in one powerful platform.
          </p>

          {/* <div className="aspect-video bg-card rounded-2xl shadow-lg border border-border overflow-hidden mb-8">
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">Watch how it works</p>
              </div>
            </div>
          </div> */}

          <div className="flex items-center gap-6">
            {channels.map((channel) => (
              <div key={channel.label} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-card shadow-md flex items-center justify-center border border-border">
                  <channel.icon className={`w-6 h-6 ${channel.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{channel.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2026 Cell24x7. All rights reserved.
        </p>
      </div>

      {/* Right Section */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/logo.png" alt="Cell24x7" className="w-10 h-10 rounded-xl" />
            <span className="text-xl font-bold">Cell24x7</span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-fade-in">
              {/* Demo banner completely removed */}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={handleLoginEmailChange}
                    required
                    className={loginEmailError ? 'border-red-500' : ''}
                  />
                  {loginEmailError && <p className="text-sm text-red-500">{loginEmailError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={handleLoginPasswordChange}
                    required
                    className={loginPasswordError ? 'border-red-500' : ''}
                  />
                  {loginPasswordError && <p className="text-sm text-red-500">{loginPasswordError}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <a href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>

                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log In
                </Button>
              </form>

              {/* <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="outline" type="button">
                
                    Google
                  </Button>
                  <Button variant="outline" type="button">
                 
                    Microsoft
                  </Button>
                </div>
              </div> */}
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-company">Company Name</Label>
                  <Input
                    id="signup-company"
                    type="text"
                    placeholder="Acme Inc."
                    value={signupCompany}
                    onChange={(e) => setSignupCompany(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@company.com"
                    value={signupEmail}
                    onChange={handleSignupEmailChange}
                    required
                    className={signupEmailError ? 'border-red-500' : ''}
                  />
                  {signupEmailError && <p className="text-sm text-red-500">{signupEmailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="outline" type="button">
                    {/* Google */}
                    Google
                  </Button>
                  <Button variant="outline" type="button">
                    {/* Microsoft */}
                    Microsoft
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}