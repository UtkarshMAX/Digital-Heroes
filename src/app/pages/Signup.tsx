import React from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { HeartHandshake } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';

export function Signup() {
  const navigate = useNavigate();
  const { signUp, backendMode } = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    const result = await signUp({ fullName: name, email, password });
    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);
      return;
    }

    setError('');
    navigate('/subscription', { replace: true });
    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl flex rounded-2xl overflow-hidden shadow-2xl bg-card border border-border flex-row-reverse">
        {/* Right Side - Image/Branding */}
        <div className="hidden lg:flex w-1/2 bg-secondary relative items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-10 mix-blend-multiply">
            {/* Abstract pattern instead of golf imagery */}
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="2" fill="currentColor" />
              </pattern>
              <rect width="100" height="100" fill="url(#dots)" />
            </svg>
          </div>
          
          <div className="relative z-10 text-primary max-w-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-secondary">
                  <HeartHandshake className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Impact Golf</h1>
              </div>
              
              <h2 className="text-4xl font-semibold mb-6 leading-tight">
                Turn your best rounds into a legacy of giving.
              </h2>
              <p className="text-primary/80 text-lg leading-relaxed font-medium">
                Start tracking your scores, joining the monthly draws, and supporting causes you care about.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Left Side - Signup Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-card">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-foreground mb-3">Create an account</h2>
              <p className="text-muted-foreground">Join the platform to track scores and win prizes.</p>
              <p className="text-xs text-muted-foreground/80 mt-2">
                {backendMode === 'supabase'
                  ? 'New accounts will be created in Supabase Auth and synced into your database profile.'
                  : 'Demo mode is active until Supabase environment variables are configured.'}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2.5">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) {
                      setError('');
                    }
                  }}
                  autoComplete="name"
                  className="h-12 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-colors"
                  required 
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) {
                      setError('');
                    }
                  }}
                  autoComplete="email"
                  className="h-12 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-colors"
                  required 
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) {
                      setError('');
                    }
                  }}
                  autoComplete="new-password"
                  className="h-12 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-colors"
                  required 
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (error) {
                      setError('');
                    }
                  }}
                  autoComplete="new-password"
                  className="h-12 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-colors"
                  required
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button className="w-full h-12 text-base font-semibold mt-4 shadow-md hover:shadow-lg transition-all" variant="secondary" size="lg" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in instead
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
