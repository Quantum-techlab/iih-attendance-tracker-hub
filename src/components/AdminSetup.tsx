import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminSetup: React.FC = () => {
  const [formData, setFormData] = useState({
    name: 'Admin User',
    email: 'admin@iih.ng',
    password: 'admin123456',
    confirmPassword: 'admin123456'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError('');
  };

  const createAdminUser = async () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First, create the user in Supabase Auth with email confirmation disabled
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            name: formData.name,
            intern_id: 'ADMIN001'
          }
        }
      });

      if (authError) {
        // Check if user already exists
        if (authError.message?.includes('already registered') || authError.message?.includes('already been registered')) {
          // Try to sign in the existing user to verify credentials work
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (signInError) {
            throw new Error('Admin user exists but credentials are incorrect. Please check your email and password.');
          } else {
            // User exists and credentials work, update their profile to admin
            if (signInData.user) {
              const { error: updateError } = await supabase
                .from('profiles')
                .upsert({ 
                  id: signInData.user.id,
                  name: formData.name,
                  role: 'admin',
                  intern_id: 'ADMIN001',
                  email: formData.email
                });

              if (updateError) {
                console.error('Update error:', updateError);
              }

              // Sign out after verification
              await supabase.auth.signOut();
              
              setSuccess(true);
              toast({
                title: "Admin user verified and updated!",
                description: `Admin credentials: ${formData.email} / ${formData.password}`,
              });
              return;
            }
          }
        } else {
          throw authError;
        }
      }

      if (authData.user) {
        // For new users, wait a moment for any database triggers
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create or update the profile to admin role
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: authData.user.id,
            name: formData.name,
            role: 'admin',
            intern_id: 'ADMIN001',
            email: formData.email
          });

        if (upsertError) {
          console.error('Profile upsert error:', upsertError);
          // Continue anyway, as the user was created
        }

        // Sign out the newly created user so they can log in normally
        await supabase.auth.signOut();

        setSuccess(true);
        toast({
          title: "Admin user created successfully!",
          description: `Admin credentials: ${formData.email} / ${formData.password}`,
        });
      }
    } catch (error: any) {
      console.error('Admin creation error:', error);
      setError(error.message || 'Failed to create admin user');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Admin User Ready!</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium">Admin Login Credentials:</p>
              <p className="text-sm text-gray-600">Email: {formData.email}</p>
              <p className="text-sm text-gray-600">Password: {formData.password}</p>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              You can now sign in as admin to access the admin dashboard.
            </p>
            <Button onClick={() => window.location.href = '/admin-login'} className="w-full">
              Go to Admin Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-center">Create Admin User</CardTitle>
        <CardDescription className="text-center">
          Set up the initial admin account for the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Admin Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={createAdminUser}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Admin User...
              </>
            ) : (
              'Create Admin User'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};