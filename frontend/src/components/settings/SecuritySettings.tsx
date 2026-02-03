import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Shield, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

export function SecuritySettings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [emailForm, setEmailForm] = useState({
    currentEmail: '',
    newEmail: '',
    confirmEmail: '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Update current email when user changes
  useEffect(() => {
    if (user?.email) {
      setEmailForm(prev => ({ ...prev, currentEmail: user.email }));
    }
  }, [user]);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (emailForm.newEmail !== emailForm.confirmEmail) {
      toast({
        title: 'Error',
        description: 'New email addresses do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (emailForm.newEmail === emailForm.currentEmail) {
      toast({
        title: 'Error',
        description: 'New email must be different from current email.',
        variant: 'destructive',
      });
      return;
    }

    setEmailLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      console.log('Sending email change request:', { newEmail: emailForm.newEmail });
      
      const response = await axios.put(
        `${API_URL}/profile/change-email`,
        { newEmail: emailForm.newEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Update token and user context
        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token);
        }
        if (response.data.user) {
          updateUser(response.data.user);
        }

        toast({
          title: 'Email Updated',
          description: 'Your email address has been changed successfully.',
        });
        setEmailForm({ 
          currentEmail: emailForm.newEmail, 
          newEmail: '', 
          confirmEmail: '' 
        });
      }
    } catch (err: any) {
      console.error('Email change error:', err.response?.data);
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to update email',
        variant: 'destructive',
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `${API_URL}/profile/change-password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast({
          title: 'Password Updated',
          description: 'Your password has been changed successfully.',
        });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Change */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Change Email Address</CardTitle>
              <CardDescription>
                Update your email address for account notifications and login
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentEmail">Current Email</Label>
              <Input
                id="currentEmail"
                type="email"
                value={emailForm.currentEmail}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="Enter new email address"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                required
                disabled={emailLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Confirm New Email</Label>
              <Input
                id="confirmEmail"
                type="email"
                placeholder="Confirm new email address"
                value={emailForm.confirmEmail}
                onChange={(e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value })}
                required
                disabled={emailLoading}
              />
            </div>
            <Button type="submit" className="gradient-primary" disabled={emailLoading}>
              {emailLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Update Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  placeholder="Enter new password (min 8 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="gradient-primary" disabled={passwordLoading}>
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
