import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, ArrowLeft } from 'lucide-react';

interface TenantRegisterProps {
  onBack: () => void;
}

export default function TenantRegister({ onBack }: TenantRegisterProps) {
  const [step, setStep] = useState<'token' | 'register'>('token');
  const [token, setToken] = useState('');
  const [tokenData, setTokenData] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleValidateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tenant_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Invalid or expired token');

      setTokenData(data);
      setStep('register');
    } catch (err: any) {
      setError(err.message || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tokenData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registration failed');

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: tokenData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          role: 'tenant',
          landlord_id: tokenData.landlord_id,
          apartment_number: tokenData.apartment_number,
        });

      if (profileError) throw profileError;

      const { error: updateError } = await supabase
        .from('tenant_tokens')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', tokenData.id);

      if (updateError) throw updateError;

      setSuccess('Registration successful! You can now sign in.');
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to login
        </button>

        <div className="flex items-center justify-center mb-8">
          <div className="bg-emerald-600 p-3 rounded-xl">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Tenant Registration
        </h1>
        <p className="text-center text-gray-600 mb-8">
          {step === 'token' ? 'Enter your registration token' : 'Complete your registration'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {step === 'token' ? (
          <form onSubmit={handleValidateToken} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                Registration Token
              </label>
              <input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition uppercase"
                placeholder="Enter token from landlord"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validating...' : 'Validate Token'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (from token)
              </label>
              <input
                type="email"
                value={tokenData?.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apartment Number
              </label>
              <input
                type="text"
                value={tokenData?.apartment_number}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="+234 800 000 0000"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
