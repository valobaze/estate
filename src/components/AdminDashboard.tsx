import { useState, useEffect } from 'react';
import { supabase, Profile, Payment, VisitorCode, PaymentType } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Users, CreditCard, UserCheck, TrendingUp, Calendar, Plus, FileText, Edit, Trash2, Eye, X } from 'lucide-react';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'residents' | 'bills' | 'payments' | 'visitors' | 'reports' | 'security'>('overview');
  const [residents, setResidents] = useState<Profile[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [securityStaff, setSecurityStaff] = useState<Profile[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [editingBill, setEditingBill] = useState<PaymentType | null>(null);
  const [billForm, setBillForm] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
  });
  const [securityForm, setSecurityForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalPayments: 0,
    totalVisitors: 0,
    recentVisitors: 0,
  });
  const [selectedSecurityStaff, setSelectedSecurityStaff] = useState<Profile | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchResidents();
    fetchPayments();
    fetchVisitors();
    fetchPaymentTypes();
    fetchSecurityStaff();
  }, []);

  const fetchResidents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'tenant')
      .order('created_at', { ascending: false });

    if (data) {
      setResidents(data);
      setStats((prev) => ({ ...prev, totalResidents: data.length }));
    }
  };

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, profiles(full_name, apartment_number), payment_types(name)')
      .order('created_at', { ascending: false });

    if (data) {
      setPayments(data);
      const total = data.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      setStats((prev) => ({ ...prev, totalPayments: total }));
    }
  };

  const fetchVisitors = async () => {
    const { data } = await supabase
      .from('visitor_codes')
      .select('*, profiles(full_name, apartment_number)')
      .order('created_at', { ascending: false });

    if (data) {
      setVisitors(data);
      const recent = data.filter(
        (v) => new Date(v.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;
      setStats((prev) => ({
        ...prev,
        totalVisitors: data.length,
        recentVisitors: recent,
      }));
    }
  };

  const fetchPaymentTypes = async () => {
    const { data } = await supabase
      .from('payment_types')
      .select('*')
      .order('name');

    if (data) setPaymentTypes(data);
  };

  const fetchSecurityStaff = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'security')
      .order('created_at', { ascending: false });

    if (data) setSecurityStaff(data);
  };

  const fetchVerificationHistory = async (securityGuardId: string) => {
    const { data } = await supabase
      .from('visitor_logs')
      .select(`
        *,
        visitor_codes (
          code,
          visitor_name,
          visitor_phone,
          purpose,
          valid_until,
          created_at,
          profiles!visitor_codes_tenant_id_fkey (
            full_name,
            apartment_number,
            phone
          )
        )
      `)
      .eq('entry_verified_by', securityGuardId)
      .order('entry_time', { ascending: false });

    if (data) {
      setVerificationHistory(data);
    }
  };

  const handleViewSecurityHistory = async (staff: Profile) => {
    setSelectedSecurityStaff(staff);
    setVerificationHistory([]);
    await fetchVerificationHistory(staff.id);
  };

  const handleCreateOrUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const amount = parseFloat(billForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (editingBill) {
        const { error } = await supabase
          .from('payment_types')
          .update({
            name: billForm.name,
            amount,
            frequency: billForm.frequency,
          })
          .eq('id', editingBill.id);

        if (error) throw error;
        setSuccess('Bill updated successfully!');
      } else {
        const { error } = await supabase
          .from('payment_types')
          .insert({
            name: billForm.name,
            amount,
            frequency: billForm.frequency,
            active: true,
          });

        if (error) throw error;
        setSuccess('Bill created successfully!');
      }

      setBillForm({ name: '', amount: '', frequency: 'monthly' });
      setEditingBill(null);
      setShowBillModal(false);
      fetchPaymentTypes();
    } catch (err: any) {
      setError(err.message || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBill = (bill: PaymentType) => {
    setEditingBill(bill);
    setBillForm({
      name: bill.name,
      amount: bill.amount.toString(),
      frequency: bill.frequency,
    });
    setShowBillModal(true);
  };

  const handleToggleBillStatus = async (bill: PaymentType) => {
    try {
      const { error } = await supabase
        .from('payment_types')
        .update({ active: !bill.active })
        .eq('id', bill.id);

      if (error) throw error;
      setSuccess(`Bill ${bill.active ? 'deactivated' : 'activated'} successfully!`);
      fetchPaymentTypes();
    } catch (err: any) {
      setError(err.message || 'Failed to update bill status');
    }
  };

  const handleCreateSecurityGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: securityForm.email,
        password: securityForm.password,
        options: {
          data: {
            full_name: securityForm.fullName,
            phone: securityForm.phone,
            role: 'security',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      setSuccess('Security guard enrolled successfully!');
      setSecurityForm({ email: '', password: '', fullName: '', phone: '' });
      setShowSecurityModal(false);
      fetchSecurityStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to create security guard');
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentReport = () => {
    const csvContent = [
      ['Resident', 'Apartment', 'Payment Type', 'Amount', 'Date', 'Status'],
      ...payments.map((p: any) => [
        p.profiles.full_name,
        p.profiles.apartment_number,
        p.payment_types.name,
        p.amount,
        new Date(p.created_at).toLocaleDateString(),
        p.status,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateResidentReport = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Apartment', 'Joined Date'],
      ...residents.map((r) => [
        r.full_name,
        r.email,
        r.phone || 'N/A',
        r.apartment_number || 'N/A',
        new Date(r.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resident-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateVisitorReport = () => {
    const csvContent = [
      ['Code', 'Visitor Name', 'Phone', 'Host', 'Apartment', 'Created', 'Status'],
      ...visitors.map((v: any) => [
        v.code,
        v.visitor_name,
        v.visitor_phone,
        v.profiles.full_name,
        v.profiles.apartment_number,
        new Date(v.created_at).toLocaleDateString(),
        v.used ? 'Verified' : new Date(v.valid_until) < new Date() ? 'Expired' : 'Active',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
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

        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('residents')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'residents'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Residents
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'bills'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Set Bills
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Payments
          </button>
          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'visitors'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Visitor History
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Security Staff
          </button>
        </div>

        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Estate Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-emerald-600" />
                  <span className="text-3xl font-bold text-gray-900">{stats.totalResidents}</span>
                </div>
                <p className="text-gray-600 font-medium">Total Residents</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <CreditCard className="w-8 h-8 text-emerald-600" />
                  <span className="text-3xl font-bold text-gray-900">
                    ₦{stats.totalPayments.toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-600 font-medium">Total Payments</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <UserCheck className="w-8 h-8 text-emerald-600" />
                  <span className="text-3xl font-bold text-gray-900">{stats.totalVisitors}</span>
                </div>
                <p className="text-gray-600 font-medium">Total Visitors</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <Calendar className="w-8 h-8 text-emerald-600" />
                  <span className="text-3xl font-bold text-gray-900">{stats.recentVisitors}</span>
                </div>
                <p className="text-gray-600 font-medium">Last 7 Days</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Payments</h3>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment: any) => (
                    <div
                      key={payment.id}
                      className="bg-white rounded-lg shadow p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {payment.profiles.full_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Apt {payment.profiles.apartment_number}
                          </p>
                          <p className="text-sm text-emerald-600 font-medium mt-1">
                            {payment.payment_types.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ₦{parseFloat(payment.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Visitors</h3>
                <div className="space-y-3">
                  {visitors.slice(0, 5).map((visitor: any) => (
                    <div
                      key={visitor.id}
                      className="bg-white rounded-lg shadow p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{visitor.visitor_name}</p>
                          <p className="text-sm text-gray-600">
                            Visiting: {visitor.profiles.full_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Apt {visitor.profiles.apartment_number}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              visitor.used
                                ? 'bg-green-100 text-green-700'
                                : new Date(visitor.valid_until) < new Date()
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {visitor.used
                              ? 'Verified'
                              : new Date(visitor.valid_until) < new Date()
                              ? 'Expired'
                              : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'residents' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">All Residents</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Apartment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {residents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{resident.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{resident.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{resident.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          {resident.apartment_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(resident.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Apartment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{payment.profiles.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          {payment.profiles.apartment_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payment.payment_types.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          ₦{parseFloat(payment.amount).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bills' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Estate Bills</h2>
              <button
                onClick={() => {
                  setEditingBill(null);
                  setBillForm({ name: '', amount: '', frequency: 'monthly' });
                  setShowBillModal(true);
                }}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add New Bill
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paymentTypes.map((bill) => (
                <div
                  key={bill.id}
                  className="bg-white rounded-lg shadow p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{bill.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{bill.frequency}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bill.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {bill.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-3xl font-bold text-emerald-600 mb-4">
                    ₦{bill.amount.toLocaleString()}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditBill(bill)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleBillStatus(bill)}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                      {bill.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}

              {paymentTypes.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No bills configured yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Reports</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <FileText className="w-12 h-12 text-emerald-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Resident Report</h3>
                <p className="text-gray-600 mb-6">
                  Export a CSV file with all resident information including contact details and
                  apartment numbers.
                </p>
                <button
                  onClick={generateResidentReport}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Download Report
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <CreditCard className="w-12 h-12 text-emerald-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Report</h3>
                <p className="text-gray-600 mb-6">
                  Export a CSV file with all payment records including amounts, dates, and status.
                </p>
                <button
                  onClick={generatePaymentReport}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Download Report
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <UserCheck className="w-12 h-12 text-emerald-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Visitor Report</h3>
                <p className="text-gray-600 mb-6">
                  Export a CSV file with all visitor codes including host information and
                  verification status.
                </p>
                <button
                  onClick={generateVisitorReport}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Download Report
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visitors' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Visitor History</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Apartment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitors.map((visitor: any) => (
                    <tr key={visitor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono font-bold text-gray-900">{visitor.code}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{visitor.visitor_name}</div>
                        <div className="text-sm text-gray-500">{visitor.visitor_phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {visitor.profiles.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                          {visitor.profiles.apartment_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(visitor.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            visitor.used
                              ? 'bg-green-100 text-green-800'
                              : new Date(visitor.valid_until) < new Date()
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {visitor.used
                            ? 'Verified'
                            : new Date(visitor.valid_until) < new Date()
                            ? 'Expired'
                            : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Security Staff</h2>
              <button
                onClick={() => setShowSecurityModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                Enroll Security Guard
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrolled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {securityStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{staff.full_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{staff.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{staff.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(staff.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewSecurityHistory(staff)}
                          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition"
                        >
                          <Eye className="w-4 h-4" />
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {securityStaff.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No security staff enrolled yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingBill ? 'Edit Bill' : 'Add New Bill'}
            </h3>

            <form onSubmit={handleCreateOrUpdateBill} className="space-y-4">
              <div>
                <label htmlFor="billName" className="block text-sm font-medium text-gray-700 mb-2">
                  Bill Name
                </label>
                <input
                  id="billName"
                  type="text"
                  value={billForm.name}
                  onChange={(e) => setBillForm({ ...billForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="e.g., Monthly Service Charge"
                />
              </div>

              <div>
                <label htmlFor="billAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₦)
                </label>
                <input
                  id="billAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={billForm.amount}
                  onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="billFrequency" className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <select
                  id="billFrequency"
                  value={billForm.frequency}
                  onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="one-time">One-Time</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBillModal(false);
                    setEditingBill(null);
                    setBillForm({ name: '', amount: '', frequency: 'monthly' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingBill ? 'Update Bill' : 'Create Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSecurityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Enroll Security Guard
            </h3>

            <form onSubmit={handleCreateSecurityGuard} className="space-y-4">
              <div>
                <label htmlFor="guardName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="guardName"
                  type="text"
                  value={securityForm.fullName}
                  onChange={(e) => setSecurityForm({ ...securityForm, fullName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="guardEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="guardEmail"
                  type="email"
                  value={securityForm.email}
                  onChange={(e) => setSecurityForm({ ...securityForm, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="guard@example.com"
                />
              </div>

              <div>
                <label htmlFor="guardPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="guardPhone"
                  type="tel"
                  value={securityForm.phone}
                  onChange={(e) => setSecurityForm({ ...securityForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div>
                <label htmlFor="guardPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="guardPassword"
                  type="password"
                  value={securityForm.password}
                  onChange={(e) => setSecurityForm({ ...securityForm, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowSecurityModal(false);
                    setSecurityForm({ email: '', password: '', fullName: '', phone: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSecurityStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedSecurityStaff.full_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Verification History</p>
              </div>
              <button
                onClick={() => {
                  setSelectedSecurityStaff(null);
                  setVerificationHistory([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {verificationHistory.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No verifications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {verificationHistory.map((log: any) => (
                    <div
                      key={log.id}
                      className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-emerald-300 transition"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                            Visitor Information
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <span className="text-sm text-gray-600 w-32">Code:</span>
                              <code className="text-sm font-mono font-bold text-emerald-600">
                                {log.visitor_codes.code}
                              </code>
                            </div>
                            <div className="flex items-start">
                              <span className="text-sm text-gray-600 w-32">Visitor Name:</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {log.visitor_codes.visitor_name}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-sm text-gray-600 w-32">Phone:</span>
                              <span className="text-sm text-gray-900">
                                {log.visitor_codes.visitor_phone}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-sm text-gray-600 w-32">Purpose:</span>
                              <span className="text-sm text-gray-900">
                                {log.visitor_codes.purpose || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                            Host Information
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-start">
                              <span className="text-sm text-gray-600 w-32">Host Name:</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {log.visitor_codes.profiles.full_name}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-sm text-gray-600 w-32">Apartment:</span>
                              <span className="text-sm font-semibold text-emerald-600">
                                {log.visitor_codes.profiles.apartment_number}
                              </span>
                            </div>
                            <div className="flex items-start">
                              <span className="text-sm text-gray-600 w-32">Host Phone:</span>
                              <span className="text-sm text-gray-900">
                                {log.visitor_codes.profiles.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-300">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                          Verification Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-xs text-gray-600">Code Created</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {new Date(log.visitor_codes.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Entry Time</span>
                            <p className="text-sm font-medium text-emerald-600 mt-1">
                              {new Date(log.entry_time).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Exit Time</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {log.exit_time
                                ? new Date(log.exit_time).toLocaleString()
                                : 'Still inside'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
