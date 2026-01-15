import { useState, useEffect } from 'react';
import { supabase, TenantToken, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Plus, Users, Key, Copy, Check } from 'lucide-react';

export default function LandlordDashboard() {
  const { profile, signOut } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [tokens, setTokens] = useState<TenantToken[]>([]);
  const [tenants, setTenants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    apartmentNumber: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTokens();
    fetchTenants();
  }, []);

  const fetchTokens = async () => {
    const { data } = await supabase
      .from('tenant_tokens')
      .select('*')
      .eq('landlord_id', profile?.id)
      .order('created_at', { ascending: false });

    if (data) setTokens(data);
  };

  const fetchTenants = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('landlord_id', profile?.id)
      .order('created_at', { ascending: false });

    if (data) setTenants(data);
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from('tenant_tokens')
        .insert({
          token,
          landlord_id: profile?.id,
          email: formData.email,
          apartment_number: formData.apartmentNumber,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      setSuccess('Token created successfully!');
      setFormData({ email: '', apartmentNumber: '' });
      setShowModal(false);
      fetchTokens();
    } catch (err: any) {
      setError(err.message || 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-emerald-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Landlord Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{profile?.full_name}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Registration Tokens</h2>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                Create Token
              </button>
            </div>

            <div className="space-y-4">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-emerald-600" />
                        <code className="text-lg font-mono font-bold text-gray-900">
                          {token.token}
                        </code>
                        <button
                          onClick={() => copyToClipboard(token.token)}
                          className="p-1 hover:bg-gray-100 rounded transition"
                        >
                          {copiedToken === token.token ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">{token.email}</p>
                      <p className="text-sm text-gray-600">Apartment: {token.apartment_number}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        token.used
                          ? 'bg-gray-100 text-gray-600'
                          : new Date(token.expires_at) < new Date()
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {token.used
                        ? 'Used'
                        : new Date(token.expires_at) < new Date()
                        ? 'Expired'
                        : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Expires: {new Date(token.expires_at).toLocaleDateString()}
                  </p>
                </div>
              ))}

              {tokens.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No tokens created yet</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">My Tenants</h2>

            <div className="space-y-4">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{tenant.full_name}</h3>
                  <p className="text-sm text-gray-600">{tenant.email}</p>
                  <p className="text-sm text-gray-600">{tenant.phone}</p>
                  <p className="text-sm text-emerald-600 font-medium mt-2">
                    Apartment: {tenant.apartment_number}
                  </p>
                </div>
              ))}

              {tenants.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No tenants registered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Registration Token</h3>

            <form onSubmit={handleCreateToken} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="tenant@example.com"
                />
              </div>

              <div>
                <label htmlFor="apartmentNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Apartment Number
                </label>
                <input
                  id="apartmentNumber"
                  type="text"
                  value={formData.apartmentNumber}
                  onChange={(e) => setFormData({ ...formData, apartmentNumber: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="A101"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
