import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { toast } from 'sonner';
import Logo from '../components/Logo';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await login(email, password);
      navigate('/dashboard');
      toast.success('Login successful');
    } catch (error) {
      toast.error('Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    try {
      await register(email, name, phone, password);
      toast.success('Registration successful');
      setIsRegistering(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setIsSubmitting(true);
    if (isRegistering) {
      await handleRegister();
    } else {
      await handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 page-transition">
      <div className="w-full max-w-md glass-card p-8">
        <Logo className="mb-10" size="lg" />
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <>
              <div>
                <label htmlFor="name" className="text-body block mb-1">Name</label>
                <input
                  id="name"
                  type="text"
                  className="xoul-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="phone" className="text-body block mb-1">Phone</label>
                <input
                  id="phone"
                  type="text"
                  className="xoul-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your Phone"
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="email" className="text-body block mb-1">Email</label>
            <input
              id="email"
              type="email"
              className="xoul-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="text-body block mb-1">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="xoul-input pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xoul-textSecondary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn-primary mt-8"
            disabled={isSubmitting}
          >
            {isSubmitting ? (isRegistering ? 'Registering...' : 'Signing in...') : (isRegistering ? 'Register' : 'Sign In')}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <a href="#" className="text-xoul-textSecondary hover:text-white text-sm transition-colors">
            Forgot your password?
          </a>
        </div>
        
        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)} 
            className="text-xoul-accent hover:text-xoul-accent/80 transition-colors"
            disabled={isSubmitting}
          >
            {isRegistering ? 'Back to Login' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;