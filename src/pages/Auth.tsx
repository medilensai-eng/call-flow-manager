import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Mail } from 'lucide-react';
import aspectVisionLogo from '@/assets/aspect-vision-logo.png';

const Auth = () => {
  const navigate = useNavigate();
  const { user, role, signIn, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'customer_caller') {
        navigate('/profile');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } else {
      toast.success('Login successful!');
    }

    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">

        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 gradient-dark p-12 flex-col justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display text-white">
              <span className="text-primary">Tele</span>Caller
            </h1>
            <p className="text-white/60 mt-2">Management System</p>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-8">
                <div className="bg-white rounded-xl p-4 shadow-lg">
                  <img
                    src={aspectVisionLogo}
                    alt="Aspect Vision EduTech Logo"
                    className="h-24 w-auto object-contain"
                  />
                </div>
              </div>
              <p className="text-white/60 mt-6 text-sm">
                Aspect Vision EduTech PVT. LTD.
              </p>
            </div>
          </div>

          <div></div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <Card className="w-full max-w-md shadow-card border-0">
            <CardHeader className="text-center pb-4">

              {/* Mobile logo */}
              <div className="lg:hidden flex items-center justify-center mb-4">
                <img
                  src={aspectVisionLogo}
                  alt="Aspect Vision EduTech Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>

              <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
              <CardDescription>Sign in to your account</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4">
            <img
              src={aspectVisionLogo}
              alt="Aspect Vision"
              className="h-8 w-auto object-contain"
            />
            <p className="text-muted-foreground text-sm text-center">
              © {new Date().getFullYear()} Aspect Vision EduTech PVT. LTD. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Auth;
