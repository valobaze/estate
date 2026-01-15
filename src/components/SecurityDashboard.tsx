import { useState, useEffect } from 'react';
import { supabase, VisitorCode, VisitorLog } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Search, Shield, CheckCircle, XCircle, Clock, LogIn, LogOut as LogOutIcon } from 'lucide-react';

export default function SecurityDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'verify' | 'active' | 'history'>('verify');
  const [searchCode, setSearchCode] = useState('');
  const [verifiedCodes, setVerifiedCodes] = useState<VisitorCode[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [visitorHistory, setVisitorHistory] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchVerifiedCodes();
    fetchActiveVisitors();
    fetchVisitorHistory();
  }, []);

  const fetchVerifiedCodes = async () => {
    const { data } = await supabase
      .from('visitor_codes')
      .select('*, profiles!visitor_codes_tenant_id_fkey(full_name, apartment_number)')
      .eq('used', true)
      .order('verified_at', { ascending: false })
      .limit(20);

    if (data) setVerifiedCodes(data as any);
  };

  const fetchActiveVisitors = async () => {
    const { data } = await supabase
      .from('visitor_logs')
      .select(`
        *,
        visitor_codes (
          code,
          visitor_name,
          visitor_phone,
          visit_type,
          pickup_service,
          driver_license_plate,
          car_color,
          car_name,
          delivery_service,
          profiles (full_name, apartment_number)
        )
      `)
      .is('exit_time', null)
      .order('entry_time', { ascending: false });

    if (data) setActiveVisitors(data);
  };

  const fetchVisitorHistory = async () => {
    const { data } = await supabase
      .from('visitor_logs')
      .select(`
        *,
        visitor_codes (
          code,
          visitor_name,
          visitor_phone,
          profiles (full_name, apartment_number)
        )
      `)
      .not('exit_time', 'is', null)
      .order('exit_time', { ascending: false })
      .limit(50);

    if (data) setVisitorHistory(data);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSearchResult(null);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('visitor_codes')
        .select('*, profiles!visitor_codes_tenant_id_fkey(full_name, apartment_number, phone)')
        .eq('code', searchCode)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Code not found');

      setSearchResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!searchResult) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const now = new Date();
      const validUntil = new Date(searchResult.valid_until);

      if (searchResult.used) {
        throw new Error('This code has already been used');
      }

      if (validUntil < now) {
        throw new Error('This code has expired');
      }

      const { error: updateError } = await supabase
        .from('visitor_codes')
        .update({
          used: true,
          verified_by: profile?.id,
          verified_at: now.toISOString(),
        })
        .eq('id', searchResult.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('visitor_logs')
        .insert({
          visitor_code_id: searchResult.id,
          entry_time: now.toISOString(),
          entry_verified_by: profile?.id,
        });

      if (logError) throw logError;

      setSuccess('Visitor entry logged successfully!');
      setSearchCode('');
      setSearchResult(null);
      fetchVerifiedCodes();
      fetchActiveVisitors();
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogExit = async (logId: string) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error } = await supabase
        .from('visitor_logs')
        .update({
          exit_time: new Date().toISOString(),
          exit_verified_by: profile?.id,
        })
        .eq('id', logId);

      if (error) throw error;

      setSuccess('Visitor exit logged successfully!');
      fetchActiveVisitors();
      fetchVisitorHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to log exit');
    } finally {
      setLoading(false);
    }
  };

  const getCodeStatus = () => {
    if (!searchResult) return null;

    const now = new Date();
    const validUntil = new Date(searchResult.valid_until);

    if (searchResult.used) {
      return { type: 'used', message: 'This code has already been used', color: 'red' };
    }

    if (validUntil < now) {
      return { type: 'expired', message: 'This code has expired', color: 'red' };
    }

    return { type: 'valid', message: 'Code is valid', color: 'green' };
  };

  const status = getCodeStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-6 h-6 text-emerald-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Security Dashboard</h1>
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
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'verify'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Verify Visitor
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Active Visitors
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Visitor History
          </button>
        </div>

        {activeTab === 'verify' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Verify Visitor Code</h2>

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

            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-mono text-lg"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </form>

            {searchResult && (
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-4xl font-bold font-mono text-gray-900">
                    {searchResult.code}
                  </div>
                  {status && (
                    <div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        status.color === 'green'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {status.color === 'green' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span className="font-medium text-sm">{status.message}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Visitor Name</label>
                    <p className="text-lg font-semibold text-gray-900">{searchResult.visitor_name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Visitor Phone</label>
                    <p className="text-lg text-gray-900">{searchResult.visitor_phone}</p>
                  </div>

                  {searchResult.purpose && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Purpose</label>
                      <p className="text-lg text-gray-900">{searchResult.purpose}</p>
                    </div>
                  )}

                  {searchResult.visit_type && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <label className="text-sm font-semibold text-emerald-700 block mb-2">
                        {searchResult.visit_type === 'pickup' && 'Pickup Service'}
                        {searchResult.visit_type === 'delivery' && 'Package Delivery'}
                        {searchResult.visit_type === 'food_delivery' && 'Food Delivery'}
                      </label>
                      {searchResult.visit_type === 'pickup' && (
                        <div className="text-sm text-gray-700 space-y-1">
                          <p><strong>Service:</strong> {searchResult.pickup_service}</p>
                          <p><strong>License Plate:</strong> {searchResult.driver_license_plate}</p>
                          <p><strong>Car:</strong> {searchResult.car_name}</p>
                          <p><strong>Color:</strong> {searchResult.car_color}</p>
                        </div>
                      )}
                      {(searchResult.visit_type === 'delivery' || searchResult.visit_type === 'food_delivery') && (
                        <p className="text-sm text-gray-700">
                          <strong>Service:</strong> {searchResult.delivery_service}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-600">Tenant</label>
                    <p className="text-lg text-gray-900">{searchResult.profiles.full_name}</p>
                    <p className="text-sm text-gray-600">
                      Apartment {searchResult.profiles.apartment_number}
                    </p>
                    <p className="text-sm text-gray-600">{searchResult.profiles.phone}</p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        Valid until: {new Date(searchResult.valid_until).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {status?.type === 'valid' && (
                    <button
                      onClick={handleVerifyCode}
                      disabled={loading}
                      className="w-full mt-4 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 font-medium"
                    >
                      {loading ? 'Verifying...' : 'Grant Access'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Verifications</h2>

            <div className="space-y-4">
              {verifiedCodes.map((code: any) => (
                <div
                  key={code.id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xl font-bold font-mono text-gray-900 mb-1">
                        {code.code}
                      </div>
                      <p className="text-sm text-gray-600">{code.visitor_name}</p>
                      <p className="text-xs text-gray-500">{code.visitor_phone}</p>
                      {code.visit_type && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                          {code.visit_type === 'pickup' && 'Pickup'}
                          {code.visit_type === 'delivery' && 'Delivery'}
                          {code.visit_type === 'food_delivery' && 'Food Delivery'}
                        </span>
                      )}
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>

                  <div className="border-t pt-2 mt-2">
                    <p className="text-sm text-gray-600">
                      {code.profiles.full_name} - Apt {code.profiles.apartment_number}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Verified: {new Date(code.verified_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              {verifiedCodes.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No verifications yet</p>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {activeTab === 'active' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Visitors In Estate</h2>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeVisitors.map((visitor: any) => (
                <div
                  key={visitor.id}
                  className="bg-white rounded-lg shadow p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 mb-1">
                        {visitor.visitor_codes.code}
                      </div>
                      <h3 className="font-semibold text-gray-900">{visitor.visitor_codes.visitor_name}</h3>
                      <p className="text-sm text-gray-600">{visitor.visitor_codes.visitor_phone}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Inside
                    </span>
                  </div>

                  {visitor.visitor_codes.visit_type && (
                    <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">
                        {visitor.visitor_codes.visit_type === 'pickup' && 'Pickup Service'}
                        {visitor.visitor_codes.visit_type === 'delivery' && 'Package Delivery'}
                        {visitor.visitor_codes.visit_type === 'food_delivery' && 'Food Delivery'}
                      </p>
                      {visitor.visitor_codes.visit_type === 'pickup' && (
                        <div className="text-xs text-gray-700 space-y-0.5">
                          <p><strong>Service:</strong> {visitor.visitor_codes.pickup_service}</p>
                          <p><strong>Plate:</strong> {visitor.visitor_codes.driver_license_plate}</p>
                          <p><strong>Car:</strong> {visitor.visitor_codes.car_name} - {visitor.visitor_codes.car_color}</p>
                        </div>
                      )}
                      {(visitor.visitor_codes.visit_type === 'delivery' || visitor.visitor_codes.visit_type === 'food_delivery') && (
                        <p className="text-xs text-gray-700">
                          <strong>Service:</strong> {visitor.visitor_codes.delivery_service}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="border-t pt-3 mb-3">
                    <p className="text-sm text-gray-600">
                      Visiting: {visitor.visitor_codes.profiles.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Apartment {visitor.visitor_codes.profiles.apartment_number}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <LogIn className="w-4 h-4" />
                    <span>Entry: {new Date(visitor.entry_time).toLocaleString()}</span>
                  </div>

                  <button
                    onClick={() => handleLogExit(visitor.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    {loading ? 'Logging...' : 'Log Exit'}
                  </button>
                </div>
              ))}

              {activeVisitors.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No active visitors</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Visitor Entry/Exit History</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exit Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitorHistory.map((log: any) => {
                    const duration = Math.floor(
                      (new Date(log.exit_time).getTime() - new Date(log.entry_time).getTime()) / 60000
                    );
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {log.visitor_codes.visitor_name}
                          </div>
                          <div className="text-sm text-gray-500">{log.visitor_codes.visitor_phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {log.visitor_codes.profiles.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Apt {log.visitor_codes.profiles.apartment_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(log.entry_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(log.exit_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {visitorHistory.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No visitor history yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
