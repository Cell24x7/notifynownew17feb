import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';
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
import { WelcomePopup } from '@/components/auth/WelcomePopup';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('signup');
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
    if (user?.role === 'admin' || user?.role === 'reseller') {
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
           if (currentUser.role === 'admin' || currentUser.role === 'reseller') {
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
    // Account created in PasswordCreation, notification sent by backend
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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 lg:h-screen lg:overflow-hidden">
  {/* Left Section */}
  <div className="hidden lg:block h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] bg-gradient-to-br from-primary/15 via-background to-emerald-500/10">
    <div className="min-h-full flex flex-col px-10 py-12">
      <div className="w-full max-w-xl mx-auto my-auto">
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.svg" alt="NotifyNow" className="w-12 h-12 rounded-xl shadow-lg" />
          <span className="text-2xl font-bold">NotifyNow</span>
        </div>

        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Go Live Today . FREE WhatsApp Business API
        </div>

        <h1 className="text-4xl lg:text-4xl font-extrabold leading-tight tracking-tight text-foreground mb-6">
          <span className="block mb-1">Intelligent Messaging Across</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl lg:text-3xl">
            <span className="text-blue-500">SMS</span>
            <span className="text-muted-foreground/30 font-light px-1">|</span>
            <span className="text-green-500">WhatsApp</span>
            <span className="text-muted-foreground/30 font-light px-1">|</span>
            <span className="text-purple-500">RCS</span>
          </div>
        </h1>

        <p className="text-base lg:text-lg font-medium text-muted-foreground mb-8 max-w-lg">
          Drive Business Growth with{" "}
          <span className="text-primary font-bold">AI-Powered</span> Conversations
        </p>

        <p className="text-lg text-muted-foreground leading-relaxed mb-7">
          Launch in minutes. Engage customers faster with official WhatsApp API, bulk campaigns,
          smart automation and seamless integrations{" "}
          <span className="font-semibold text-foreground">in one secure platform</span>.
        </p>

        {/* Stats / Trust Row */}
        <div className="flex flex-wrap items-center gap-3 mb-7">
          <div className="px-4 py-2 rounded-xl bg-card/70 backdrop-blur border border-border shadow-sm">
            <p className="text-sm text-muted-foreground">Channels</p>
            <p className="text-lg font-bold text-foreground">3-in-1</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-card/70 backdrop-blur border border-border shadow-sm">
            <p className="text-sm text-muted-foreground">Setup Time</p>
            <p className="text-lg font-bold text-foreground">10 mins</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-card/70 backdrop-blur border border-border shadow-sm">
            <p className="text-sm text-muted-foreground">Support</p>
            <p className="text-lg font-bold text-foreground">24X7</p>
          </div>
        </div>

        <ul className="space-y-3 mb-8 text-base text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="mt-2 w-2.5 h-2.5 rounded-full bg-primary" />
            <span>
              <span className="font-semibold text-foreground">Official WhatsApp API</span> + AI Chat Automation
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-2 w-2.5 h-2.5 rounded-full bg-primary" />
            <span>
              Bulk <span className="font-semibold text-foreground">SMS / RCS Campaigns</span> with delivery tracking
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-2 w-2.5 h-2.5 rounded-full bg-primary" />
            <span>
              Plug & play <span className="font-semibold text-foreground">APIs + Webhooks</span> for integrations
            </span>
          </li>
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="tel:+919892891772"
            className="px-5 py-2.5 text-sm rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Call Now
          </a>

          <a
            href="mailto:info@notifynow.in"
            className="px-5 py-2.5 text-sm rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Email Now
          </a>
        </div>
      </div>
    </div>
  </div>

  {/* Right Section */}
  <div className="flex flex-col items-center px-6 py-12 lg:px-10 bg-background min-h-screen lg:min-h-0 lg:h-full lg:overflow-y-auto">
    <div className="w-full max-w-md my-auto">
      {/* Mobile Logo */}
      <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
        <img src="/logo.svg" alt="NotifyNow" className="w-10 h-10 rounded-xl shadow-sm" />
        <span className="text-xl font-bold tracking-tight">NotifyNow</span>
      </div>

      {/* Modern Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xl p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-blue-600">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Login to continue or create a new account.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1 mb-6">
            <TabsTrigger value="login" className="rounded-lg">
              Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-lg">
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="animate-fade-in">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email or Mobile</Label>
                <Input
                  id="login-email"
                  type="text"
                  placeholder="Enter your email or mobile number"
                  value={loginEmail}
                  onChange={handleLoginEmailChange}
                  required
                  className={`h-11 rounded-xl ${loginEmailError ? 'border-red-500' : ''}`}
                />
                {loginEmailError && <p className="text-sm text-red-500">{loginEmailError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your secure password"
                  value={loginPassword}
                  onChange={handleLoginPasswordChange}
                  required
                  className={`h-11 rounded-xl ${loginPasswordError ? 'border-red-500' : ''}`}
                />
                {loginPasswordError && <p className="text-sm text-red-500">{loginPasswordError}</p>}
              </div>

              <div className="flex items-center justify-between pt-1">
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

                <a href="/forgot-password" className="text-sm text-primary font-medium hover:underline">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl font-bold shadow-lg gradient-primary text-primary-foreground"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log In
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Secure login â€¢ Encrypted session
              </div>



            </form>
            
            
          </TabsContent>

          <TabsContent value="signup" className="animate-fade-in">
            <div className="space-y-4">
              {signupStep === 'email' && (
                <EmailSignup onOtpSent={handleSignupOtpSent} isLoading={loading} />
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
            </div>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
          By continuing, you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Terms of Service</a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Privacy Policy</a>.
        </p>
      </div>
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