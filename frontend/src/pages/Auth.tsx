import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Phone, Loader2, Star, Mail } from 'lucide-react';
import { EmailSignup } from '@/components/auth/EmailSignup';
import { OtpVerification } from '@/components/auth/OtpVerification';
import { PasswordCreation } from '@/components/auth/PasswordCreation';
import { WelcomePopup } from '@/components/auth/WelcomePopup';
import { useBranding } from '@/contexts/BrandingContext';
import { FeedbackDialog } from '@/components/auth/FeedbackDialog';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useBranding();

  // Signup flow states
  const [signupStep, setSignupStep] = useState<'email' | 'otp' | 'password' | 'done'>('email');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
    if (validateEmail(identifier)) return true;
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
        setTimeout(() => {
          const token = localStorage.getItem('authToken');
          if (token) {
            const currentUser = JSON.parse(atob(token.split('.')[1] || '{}'));
            if (currentUser.role === 'admin' || currentUser.role === 'reseller') {
              navigate('/super-admin/dashboard', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
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

  const handleSignupOtpSent = (identifier: string) => {
    setSignupEmail(identifier);
    setSignupStep('otp');
  };

  const handleOtpVerified = (otp: string) => {
    setSignupOtp(otp);
    setSignupStep('password');
  };

  const handlePasswordCreated = () => {
    setSignupStep('done');
    navigate('/dashboard');
  };

  const handleBackToEmail = () => {
    setSignupStep('email');
    setSignupEmail('');
    setSignupOtp('');
  };

  return (
    <div className="min-h-screen w-full bg-[#0047FF] relative overflow-hidden flex items-center justify-center p-4 lg:p-8 font-sans">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#2D62FF] rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0035C2] rounded-full blur-[100px] opacity-60"></div>
      <div className="absolute top-[20%] right-[10%] w-[15%] h-[15%] bg-[#4A7DFF] rounded-full blur-[60px] opacity-40"></div>
      
      {/* Main Container Card */}
      <div className="w-full max-w-[1200px] h-full lg:h-[700px] bg-white/10 backdrop-blur-md rounded-[40px] flex flex-col lg:flex-row shadow-2xl overflow-hidden border border-white/20 z-10">
        
        {/* Left Section - Blue Gradient Content */}
        <div className="w-full lg:w-3/5 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-blue-700/80 to-blue-900/40">
          
          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-[#312E81] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-6 bg-white rounded-full"></div>
                  <div className="w-1.5 h-6 bg-white rounded-full"></div>
                </div>
              </div>
              <span className="text-3xl font-bold text-white tracking-tight">{settings?.brand_name || "NotifyNow"}</span>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 font-bold text-xs lg:text-sm mb-8">
              <div className="relative w-2 h-2">
                <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping"></span>
                <span className="relative block w-2 h-2 bg-emerald-400 rounded-full"></span>
              </div>
              Go Live Today : FREE WhatsApp Business API
            </div>

            {/* Heading */}
            <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1.1] mb-8 lg:max-w-md">
              Intelligent Messaging Across <br />
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-white">SMS</span>
                <span className="text-white/30 font-thin">|</span>
                <span className="text-[#25D366]">WhatsApp</span>
                <span className="text-white/30 font-thin">|</span>
                <span className="text-white">RCS</span>
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-xl lg:text-2xl font-bold text-white mb-6">
              Drive Business Growth with <span className="text-[#25D366]">AI-Powered</span> Conversations
            </p>

            <p className="text-base lg:text-lg text-blue-100/80 mb-10 leading-relaxed font-medium max-w-lg">
              Engage customers faster with official WhatsApp API, bulk campaigns, and seamless automations in one powerful platform.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <a
                href="tel:+919892975484"
                className="px-8 py-4 rounded-2xl bg-[#00C853] text-white font-extrabold text-lg shadow-[0_8px_20px_-6px_rgba(0,200,83,0.5)] hover:bg-[#00E676] transition-all flex items-center gap-3"
              >
                <Phone className="w-5 h-5 fill-white" />
                Call Now
              </a>

              <a
                href="mailto:notify@notifynow.in"
                className="px-8 py-4 rounded-2xl bg-white text-blue-800 font-extrabold text-lg shadow-xl hover:bg-blue-50 transition-all flex items-center gap-3"
              >
                <Mail className="w-5 h-5" />
                Email Now
              </a>
            </div>
          </div>

          {/* Testimonial Block */}
          <div className="relative z-10 mt-auto">
            <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-sm shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-12 h-12 text-blue-900" />
              </div>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#FFB300] text-[#FFB300]" />
                ))}
              </div>
              <p className="text-[#1E293B] text-lg font-semibold leading-relaxed italic mb-4">
                "Excellent messaging platform with great support team. Campaign management is very easy to handle."
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[#059669] font-black text-sm">Amit Patel</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-bold text-sm">GrowthEdge</span>
              </div>
            </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[40px]"></div>
          <div className="absolute top-[20%] right-[-50px] w-[150px] h-[150px] bg-blue-400/20 rounded-full blur-[30px]"></div>
        </div>

        {/* Right Section - White Form Box */}
        <div className="w-full lg:w-2/5 bg-[#F8FAFC] p-6 lg:p-12 flex flex-col items-center justify-center relative">
          
          <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100">
            
            {/* Form Header */}
            <div className="bg-[#2563EB] p-8 pb-12 relative overflow-hidden">
              <div className="absolute top-4 right-6">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsFeedbackOpen(true)}
                  className="text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest gap-1.5 h-8 px-3 rounded-full"
                >
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  Give Feedback
                </Button>
              </div>

              <h2 className="text-4xl font-black text-white mb-2">Welcome Back!</h2>
              <p className="text-blue-100 text-sm font-medium">Login to continue or sign up for a new account.</p>
              
              <div className="absolute bottom-[-20px] left-0 right-0 h-10 bg-white rounded-t-[32px]"></div>
            </div>

            {/* Form Body */}
            <div className="p-8 pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-slate-100 p-1.5 mb-8">
                  <TabsTrigger 
                    value="login" 
                    className="rounded-full text-base font-bold py-2.5 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="rounded-full text-base font-bold py-2.5 data-[state=active]:bg-[#2563EB] data-[state=active]:text-white transition-all shadow-sm"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="animate-fade-in mt-0 space-y-6">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-bold text-slate-700 ml-1">Email or Mobile</Label>
                      <Input
                        id="login-email"
                        type="text"
                        placeholder="demo@gmail.com"
                        value={loginEmail}
                        onChange={handleLoginEmailChange}
                        required
                        className={`h-14 px-5 text-base font-medium rounded-2xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${loginEmailError ? 'border-red-400' : ''}`}
                      />
                      {loginEmailError && <p className="text-xs text-red-500 mt-1 ml-1 font-bold">{loginEmailError}</p>}
                    </div>

                    <div className="space-y-2">
                       <Label htmlFor="login-password" className="text-sm font-bold text-slate-700 ml-1">Password</Label>
                       <div className="relative">
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={handleLoginPasswordChange}
                          required
                          className={`h-14 px-5 text-base font-medium rounded-2xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${loginPasswordError ? 'border-red-400' : ''}`}
                        />
                        <a href="/forgot-password" d-id="forgot-password" className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-blue-600 font-bold hover:underline">
                          Forgot Password?
                        </a>
                      </div>
                      {loginPasswordError && <p className="text-xs text-red-500 mt-1 ml-1 font-bold">{loginPasswordError}</p>}
                    </div>

                    <div className="flex items-center gap-3 py-1">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="w-5 h-5 rounded-full border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-none"
                      />
                      <Label htmlFor="remember" className="text-sm font-bold text-slate-600 cursor-pointer">
                        Remember Me
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-14 rounded-2xl font-black text-xl shadow-[0_10px_25px_-8px_rgba(16,185,129,0.5)] bg-[#00C853] hover:bg-[#00E676] text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Log In"}
                    </Button>

                    <div className="flex items-center justify-center gap-2 pt-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Secure Login • Encrypted Session</span>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-bold">
                        By logging in, you agree to our <a href="#" className="text-slate-700 hover:underline">Terms of Service</a> and <a href="#" className="text-slate-700 hover:underline">Privacy Policy</a>
                      </p>
                    </div>

                    {/* Social Login Divider */}
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                    </div>

                    {/* Social Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                      <button type="button" className="h-12 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </button>
                      <button type="button" className="h-12 flex items-center justify-center rounded-xl bg-[#1877F2] hover:bg-[#166FE5] transition-all shadow-[0_4px_12px_-4px_rgba(24,119,242,0.5)]">
                        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978 1.62 0 3.33.193 3.33.193v2.537h-1.3c-2.01 0-2.636 1.228-2.636 2.484v2.344h3.357l-.536 3.667h-2.821v7.98h-4.3z"/>
                        </svg>
                      </button>
                      <button type="button" className="h-12 flex items-center justify-center rounded-xl bg-[#0077B5] hover:bg-[#00669C] transition-all shadow-[0_4px_12px_-4px_rgba(0,119,181,0.5)]">
                        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                          <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                        </svg>
                      </button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="animate-fade-in mt-0">
                  <div className="space-y-6">
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
            </div>
          </div>
        </div>
      </div>

      <WelcomePopup
        isOpen={showWelcome}
        onClose={() => { }}
        userName={user?.name}
        role={user?.role}
      />

      <FeedbackDialog 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
}