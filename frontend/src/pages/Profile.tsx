// src/pages/Profile.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Building2, Phone, Lock, Shield } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = 'http://localhost:5000/api'; // ya tera production URL

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    company: user?.company || '',          // DB column name = company
    contact_phone: user?.contact_phone || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        company: user.company || '',
        contact_phone: user.contact_phone || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.put(`${API_URL}/profile`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (res.data.success) {
        // Update local context state
        updateUser(res.data.user);
        toast({ title: "Saved", description: "Profile updated successfully" });
        setIsEditing(false);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: err.response?.data?.message || "Could not save changes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ variant: "destructive", title: "Password must be at least 8 characters" });
      return;
    }

    setPasswordLoading(true);
    try {
    
const res = await axios.put(`${API_URL}/profile/change-password`, {  
  currentPassword: passwordForm.currentPassword,
  newPassword: passwordForm.newPassword,
}, {
  headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
});
      if (res.data.success) {
        toast({ title: "Success", description: "Password changed successfully" });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: err.response?.data?.message || "Current password incorrect or server error",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
              Edit Profile
            </Button>
          )}
        </div>

        {/* Personal Info Card */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar + Name */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-muted">
                <AvatarImage src={user?.profile_picture} alt={user?.name} />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="text-center sm:text-left">
                <h3 className="text-xl font-semibold">{user?.name || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted/50" />
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
            </div>

            {/* Buttons */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user?.name || '',
                      company: user?.company || '',
                      contact_phone: user?.contact_phone || '',
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Shield className="h-5 w-5 text-primary" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="outline" className="mt-1 text-base px-3 py-1 capitalize">
                  {user?.role || 'user'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-lg font-medium mt-1 capitalize">
                  {user?.plan_id || 'Basic'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="text-lg mt-1">
                  {user?.created_at
                    ? format(new Date(user.created_at), 'MMM dd, yyyy')
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handlePasswordUpdate}
              disabled={passwordLoading}
              className="w-full sm:w-auto"
            >
              {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}