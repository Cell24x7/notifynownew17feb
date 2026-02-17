import { useState } from 'react';
import { API_BASE_URL } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PasswordCreationProps {
  email: string;
  otp: string;
  onPasswordCreated: () => void;
  isLoading: boolean;
}

export function PasswordCreation({ email, otp, onPasswordCreated, isLoading }: PasswordCreationProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { toast } = useToast();

  const validatePassword = (pwd: string) => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(pwd)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    return '';
  };

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [secondaryIdentifier, setSecondaryIdentifier] = useState('');

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value && value !== password) {
      setConfirmPasswordError('Passwords do not match');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwdError = validatePassword(password);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: email,
          password,
          otp,
          name,
          company,
          // If primary is email, send mobile as secondary. If primary is mobile, send email as secondary.
          mobile: email.includes('@') ? secondaryIdentifier : undefined,
          email: !email.includes('@') ? secondaryIdentifier : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to create account',
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();

      // Store auth token
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      toast({
        title: 'Account Created',
        description: 'Your account has been created successfully!',
      });

      onPasswordCreated();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const passwordStrength = password ? (password.length >= 8 ? 'strong' : 'weak') : '';

  return (
    <form onSubmit={handleCreateAccount} className="space-y-6">
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
        <Label className="text-sm text-muted-foreground">Email / Mobile</Label>
        <p className="font-medium break-all text-primary">{email}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
           <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
           <Input 
             id="name" 
             placeholder="John Doe" 
             value={name} 
             onChange={(e) => setName(e.target.value)} 
             className="py-6"
           />
        </div>

        <div className="space-y-2">
           <Label htmlFor="company">Company Name <span className="text-red-500">*</span></Label>
           <Input 
             id="company" 
             placeholder="Acme Inc." 
             value={company} 
             onChange={(e) => setCompany(e.target.value)} 
             className="py-6"
           />
        </div>

        {/* Conditional Secondary Contact Field - MANDATORY */}
        <div className="space-y-2">
           <Label htmlFor="secondary-contact">
             {email.includes('@') ? 'Mobile Number' : 'Email Address'} <span className="text-red-500">*</span>
           </Label>
           <Input 
             id="secondary-contact"
             type={email.includes('@') ? 'tel' : 'email'}
             placeholder={email.includes('@') ? 'Enter your mobile number' : 'Enter your email address'}
             value={secondaryIdentifier}
             onChange={(e) => setSecondaryIdentifier(e.target.value)} 
             className="py-6"
           />
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label htmlFor="password">Create Password <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={handlePasswordChange}
              disabled={isLoading}
              className={`py-6 pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${passwordError ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwordError ? (
            <p className="text-sm text-red-500">{passwordError}</p>
          ) : password ? (
            <p className="text-sm text-green-500">✓ Password strength: Strong</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              disabled={isLoading}
              className={`py-6 pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${confirmPasswordError ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {confirmPasswordError && <p className="text-sm text-red-500">{confirmPasswordError}</p>}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-blue-900">Password Requirements:</p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className={password.length >= 8 ? 'text-green-600' : ''}>
            {password.length >= 8 ? '✓' : '○'} At least 8 characters
          </li>
          <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
            {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
          </li>
          <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
            {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
          </li>
          <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
            {/[0-9]/.test(password) ? '✓' : '○'} One number
          </li>
        </ul>
      </div>

      <Button
        type="submit"
        className="w-full gradient-primary text-primary-foreground py-6 text-base font-bold shadow-lg hover:shadow-primary/20 transition-all"
        disabled={isLoading || !password || !confirmPassword || !!passwordError || !!confirmPasswordError || !name || !company || !secondaryIdentifier}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          'Create Account & Get Started'
        )}
      </Button>
    </form>
  );
}
