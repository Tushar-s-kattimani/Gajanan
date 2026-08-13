'use client';

import { useState } from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, MailWarning, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';


export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailInUse, setEmailInUse] = useState(false);

  const { signUp, sendPasswordReset } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password) {
      setError("Email and password cannot be empty.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (email.endsWith('@admin.com')) {
      setError("To create an admin account, please contact the system administrator.");
      return;
    }
    setLoading(true);
    setError('');
    setEmailInUse(false);
    setEmailInUse(false);
    try {
      await signUp(email, password);
      router.push('/');
    } catch (e: any) {
      let friendlyMessage = 'An unexpected error occurred during sign up.';
      if (e.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email already exists. Forgot your password?';
        setEmailInUse(true);
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      toast({
        title: 'Password Reset Email Sent',
        description: `Please check your inbox at ${email} to reset your password.`,
      });
      setError('');
      setEmailInUse(false);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Could not send password reset email. ${e.message}`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4 pt-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <UserPlus className="h-10 w-10" />
            </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Create a Shop Account</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Enter your details to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-8">
                <div className="space-y-6 pt-6">
                    <div className="space-y-4">
                        <Input
                        id="email"
                        type="email"
                        placeholder="Shop Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="py-6 text-base"
                        />
                        <Input
                        id="password"
                        type="password"
                        placeholder="Password (min. 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="py-6 text-base"
                        />
                    </div>
                    {error && <p className="text-sm text-center font-medium text-red-500">{error}</p>}
                    
                    <div className="space-y-3 pt-2">
                        <Button
                        onClick={handleSignUp}
                        disabled={loading}
                        className="w-full py-6 text-lg"
                        >
                        {loading && !emailInUse ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Create Account'}
                        </Button>
                        {emailInUse && (
                           <Button
                            variant="secondary"
                            onClick={handlePasswordReset}
                            disabled={loading}
                            className="w-full py-6 text-base"
                           >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                            Forgot Password?
                           </Button>
                        )}
                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/login" className="font-semibold text-primary hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
        </CardContent>
      </Card>
    </div>
  );
}
