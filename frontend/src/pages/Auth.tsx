import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Smartphone, Loader2 } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import { EmailSignup } from '@/components/auth/EmailSignup';
import { OtpVerification } from '@/components/auth/OtpVerification';
import { PasswordCreation } from '@/components/auth/PasswordCreation';
import { ProfilePopup } from '@/components/auth/ProfilePopup';
import { WelcomePopup } from '@/components/auth/WelcomePopup';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // New signup flow states
  const [signupStep, setSignupStep] = useState<'email' | 'otp' | 'password' | 'done'>('email');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const [showWelcome, setShowWelcome] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');

  if (isAuthenticated && !showWelcome) {
    if (user?.role === 'admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobileOrEmail = (identifier: string) => {
    // Check if it's an email
    if (validateEmail(identifier)) return true;
    // Check if it's a mobile number (10-13 digits)
    const mobileRegex = /^\d{10,13}$/;
    return mobileRegex.test(identifier);
  };

  const handleLoginEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginEmail(value);
    if (!value) {
      setLoginEmailError('Email or Mobile is required');
    } else if (!validateMobileOrEmail(value)) {
      setLoginEmailError('Please enter a valid email or mobile number');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginEmailError || loginPasswordError) return;

    if (!loginEmail || !loginPassword) {
      if (!loginEmail) setLoginEmailError('Email or Mobile is required');
      if (!loginPassword) setLoginPasswordError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const success = await login(loginEmail, loginPassword);

      if (success) {
        setShowWelcome(true);
        // Wait a moment for popup, then redirect will happen via reading isAuthenticated or manual navigate
        setTimeout(() => {
           // We explicitly navigate because the state update might be racing with the component unmount/remount
           // But since ShowWelcome is true, the top-level Navigate is bypassed until we decide.
           // Actually, let's look at the flow.
           // 1. login() updates context user -> isAuthenticated becomes true.
           // 2. Component re-renders. if (isAuthenticated && !showWelcome) would redirect.
           // but showWelcome IS true, so it stays here showing the popup?
           // No, we need to render the popup.
           
           const currentUser = JSON.parse(atob(localStorage.getItem('authToken')?.split('.')[1] || '{}'));
           if (currentUser.role === 'admin') {
             navigate('/super-admin/dashboard', { replace: true });
           } else {
             navigate('/dashboard', { replace: true });
           }
        }, 2000);
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    // New signup flow - this is now handled by child components
    e.preventDefault();
  };

  const handleSignupOtpSent = (identifier: string, type: 'email' | 'mobile') => {
    setSignupEmail(identifier);
    setSignupStep('otp');
  };

  const handleOtpVerified = (otp: string) => {
    setSignupOtp(otp);
    setSignupStep('password');
  };

  const handlePasswordCreated = () => {
    setSignupStep('done');
    setShowProfilePopup(true);
  };

  const handleProfileUpdated = () => {
    setShowProfilePopup(false);
    navigate('/dashboard');
  };

  const handleSkipProfile = () => {
    setShowProfilePopup(false);
    navigate('/dashboard');
  };

  const handleBackToEmail = () => {
    setSignupStep('email');
    setSignupEmail('');
    setSignupOtp('');
  };

  const channels = [
    { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-500' },
    { icon: Phone, label: 'SMS', color: 'text-blue-500' },
    { icon: Smartphone, label: 'RCS', color: 'text-purple-500' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Section - same as before */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo.svg" alt="NotifyNow" className="w-12 h-12 rounded-xl shadow-lg" />
            <span className="text-2xl font-bold">NotifyNow</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-6">
            All your customer conversations in{' '}
            <span className="text-primary">one place</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            All your customer conversations, campaigns, automations, and integrations in one powerful platform.
          </p>

     

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

        </p>
      </div>

      {/* Right Section */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/logo.svg" alt="NotifyNow" className="w-10 h-10 rounded-xl" />
            <span className="text-xl font-bold">NotifyNow</span>
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
                  <Label htmlFor="login-email">Email or Mobile</Label>
                  <Input
                    id="login-email"
                    type="text"
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

             
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              {signupStep === 'email' && (
                <EmailSignup
                  onOtpSent={handleSignupOtpSent}
                  isLoading={loading}
                />
              )}

              {signupStep === 'otp' && (
                <OtpVerification
                  email={signupEmail}
                  onOtpVerified={handleOtpVerified}
                  onBackClick={handleBackToEmail}
                  isLoading={loading}
                />
              )}

              {signupStep === 'password' && (
                <PasswordCreation
                  email={signupEmail}
                  otp={signupOtp}
                  onPasswordCreated={handlePasswordCreated}
                  isLoading={loading}
                />
              )}

              <ProfilePopup
                isOpen={showProfilePopup}
                email={signupEmail}
                onProfileUpdated={handleProfileUpdated}
                onSkip={handleSkipProfile}
              />
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
      
      <WelcomePopup 
        isOpen={showWelcome} 
        onClose={() => {}} 
        userName={user?.name}
        role={user?.role}
      />
    </div>
  );
}