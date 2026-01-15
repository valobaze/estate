import { useState, useEffect } from 'react';
import { supabase, VisitorCode, PaymentType, Payment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Plus, UserCheck, CreditCard, Clock, CheckCircle } from 'lucide-react';

export default function TenantDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'visitors' | 'payments'>('visitors');
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [visitorCodes, setVisitorCodes] = useState<VisitorCode[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    phone: '',
    purpose: '',
    validUntil: '',
    visitType: '' as '' | 'pickup' | 'delivery' | 'food_delivery',
    pickupService: '',
    driverLicensePlate: '',
    carColor: '',
    carName: '',
    deliveryService: '',
  });
  const [selectedPaymentType, setSelectedPaymentType] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchVisitorCodes();
    fetchPaymentTypes();
    fetchPayments();
  }, []);

  const fetchVisitorCodes = async () => {
    const { data } = await supabase
      .from('visitor_codes')
      .select('*')
      .eq('tenant_id', profile?.id)
      .order('created_at', { ascending: false });

    if (data) setVisitorCodes(data);
  };

  const fetchPaymentTypes = async () => {
    const { data } = await supabase
      .from('payment_types')
      .select('*')
      .eq('active', true)
      .order('name');

    if (data) setPaymentTypes(data);
  };

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, payment_types(*)')
      .eq('tenant_id', profile?.id)
      .order('created_at', { ascending: false });

    if (data) setPayments(data as any);
  };

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCreateVisitorCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (visitorForm.visitType === 'pickup') {
        if (!visitorForm.pickupService || !visitorForm.driverLicensePlate || !visitorForm.carColor || !visitorForm.carName) {
          throw new Error('All pickup details are required when visit type is Pickup');
        }
      }

      if (visitorForm.visitType === 'delivery' || visitorForm.visitType === 'food_delivery') {
        if (!visitorForm.deliveryService) {
          throw new Error('Delivery service is required when visit type is Delivery or Food Delivery');
        }
      }

      const code = generateCode();
      const validUntil = new Date(visitorForm.validUntil);

      if (validUntil <= new Date()) {
        throw new Error('Valid until date must be in the future');
      }

      const insertData: any = {
        code,
        tenant_id: profile?.id,
        visitor_name: visitorForm.name,
        visitor_phone: visitorForm.phone,
        purpose: visitorForm.purpose || null,
        valid_until: validUntil.toISOString(),
      };

      if (visitorForm.visitType) {
        insertData.visit_type = visitorForm.visitType;
      }

      if (visitorForm.visitType === 'pickup') {
        insertData.pickup_service = visitorForm.pickupService;
        insertData.driver_license_plate = visitorForm.driverLicensePlate;
        insertData.car_color = visitorForm.carColor;
        insertData.car_name = visitorForm.carName;
      }

      if (visitorForm.visitType === 'delivery' || visitorForm.visitType === 'food_delivery') {
        insertData.delivery_service = visitorForm.deliveryService;
      }

      const { error } = await supabase
        .from('visitor_codes')
        .insert(insertData);

      if (error) throw error;

      setSuccess('Visitor code generated successfully!');
      setVisitorForm({
        name: '',
        phone: '',
        purpose: '',
        validUntil: '',
        visitType: '',
        pickupService: '',
        driverLicensePlate: '',
        carColor: '',
        carName: '',
        deliveryService: '',
      });
      setShowVisitorModal(false);
      fetchVisitorCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const paymentType = paymentTypes.find(pt => pt.id === selectedPaymentType);
      if (!paymentType) throw new Error('Invalid payment type');

      const { error } = await supabase
        .from('payments')
        .insert({
          tenant_id: profile?.id,
          payment_type_id: paymentType.id,
          amount: paymentType.amount,
          status: 'completed',
          payment_date: new Date().toISOString(),
          reference: `REF-${Date.now()}`,
        });

      if (error) throw error;

      setSuccess('Payment recorded successfully!');
      setShowPaymentModal(false);
      setSelectedPaymentType('');
      fetchPayments();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <UserCheck className="w-6 h-6 text-emerald-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Tenant Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {profile?.full_name} - Apt {profile?.apartment_number}
              </span>
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

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'visitors'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Visitor Codes
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Estate Dues
          </button>
        </div>

        {activeTab === 'visitors' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Visitor Codes</h2>
              <button
                onClick={() => setShowVisitorModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                Generate Code
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visitorCodes.map((code) => {
                const isExpired = new Date(code.valid_until) < new Date();
                const isActive = !code.used && !isExpired;

                return (
                  <div
                    key={code.id}
                    className="bg-white rounded-lg shadow p-6 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-3xl font-bold text-emerald-600 font-mono">
                        {code.code}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          code.used
                            ? 'bg-gray-100 text-gray-600'
                            : isExpired
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-600'
                        }`}
                      >
                        {code.used ? 'Used' : isExpired ? 'Expired' : 'Active'}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1">{code.visitor_name}</h3>
                    <p className="text-sm text-gray-600 mb-1">{code.visitor_phone}</p>
                    {code.purpose && (
                      <p className="text-sm text-gray-600 mb-2">{code.purpose}</p>
                    )}

                    {code.visit_type && (
                      <div className="mt-2 mb-2 p-2 bg-emerald-50 rounded border border-emerald-200">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">
                          {code.visit_type === 'pickup' && 'Pickup Service'}
                          {code.visit_type === 'delivery' && 'Package Delivery'}
                          {code.visit_type === 'food_delivery' && 'Food Delivery'}
                        </p>
                        {code.visit_type === 'pickup' && (
                          <div className="text-xs text-gray-700 space-y-0.5">
                            <p><strong>Service:</strong> {code.pickup_service}</p>
                            <p><strong>Plate:</strong> {code.driver_license_plate}</p>
                            <p><strong>Car:</strong> {code.car_name} - {code.car_color}</p>
                          </div>
                        )}
                        {(code.visit_type === 'delivery' || code.visit_type === 'food_delivery') && (
                          <p className="text-xs text-gray-700">
                            <strong>Service:</strong> {code.delivery_service}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center text-xs text-gray-500 gap-1">
                      <Clock className="w-3 h-3" />
                      Valid until: {new Date(code.valid_until).toLocaleString()}
                    </div>

                    {code.used && code.verified_at && (
                      <div className="mt-2 text-xs text-gray-500">
                        Verified: {new Date(code.verified_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}

              {visitorCodes.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                  <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No visitor codes generated yet</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Estate Dues</h2>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                Make Payment
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {paymentTypes.map((type) => (
                <div key={type.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <CreditCard className="w-8 h-8 text-emerald-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">{type.name}</h3>
                  <p className="text-2xl font-bold text-emerald-600 mb-1">
                    ₦{type.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{type.frequency}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment History</h3>
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900">{payment.payment_types.name}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                    {payment.reference && (
                      <p className="text-xs text-gray-500 mt-1">Ref: {payment.reference}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      ₦{payment.amount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {payment.status}
                    </div>
                  </div>
                </div>
              ))}

              {payments.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No payment history yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showVisitorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Generate Visitor Code</h3>
            </div>

            <form onSubmit={handleCreateVisitorCode} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label htmlFor="visitorName" className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor Name
                </label>
                <input
                  id="visitorName"
                  type="text"
                  value={visitorForm.name}
                  onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="visitorPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Visitor Phone
                </label>
                <input
                  id="visitorPhone"
                  type="tel"
                  value={visitorForm.phone}
                  onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose of Visit
                </label>
                <input
                  id="purpose"
                  type="text"
                  value={visitorForm.purpose}
                  onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="Social visit"
                />
              </div>

              <div>
                <label htmlFor="visitType" className="block text-sm font-medium text-gray-700 mb-2">
                  Visit Type (Optional)
                </label>
                <select
                  id="visitType"
                  value={visitorForm.visitType}
                  onChange={(e) => setVisitorForm({ ...visitorForm, visitType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  <option value="">Regular Visit</option>
                  <option value="pickup">Pickup (Bolt, Uber, Indrive, Taxi)</option>
                  <option value="delivery">Package Delivery (Jumia, Konga, etc.)</option>
                  <option value="food_delivery">Food Delivery (Chowdeck, Glovo, etc.)</option>
                </select>
              </div>

              {visitorForm.visitType === 'pickup' && (
                <>
                  <div>
                    <label htmlFor="pickupService" className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Service *
                    </label>
                    <input
                      id="pickupService"
                      type="text"
                      value={visitorForm.pickupService}
                      onChange={(e) => setVisitorForm({ ...visitorForm, pickupService: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="e.g., Bolt, Uber, Indrive, Taxi"
                    />
                  </div>

                  <div>
                    <label htmlFor="driverLicensePlate" className="block text-sm font-medium text-gray-700 mb-2">
                      Driver License Plate *
                    </label>
                    <input
                      id="driverLicensePlate"
                      type="text"
                      value={visitorForm.driverLicensePlate}
                      onChange={(e) => setVisitorForm({ ...visitorForm, driverLicensePlate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="e.g., ABC 123 XY"
                    />
                  </div>

                  <div>
                    <label htmlFor="carColor" className="block text-sm font-medium text-gray-700 mb-2">
                      Car Color *
                    </label>
                    <input
                      id="carColor"
                      type="text"
                      value={visitorForm.carColor}
                      onChange={(e) => setVisitorForm({ ...visitorForm, carColor: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="e.g., Blue"
                    />
                  </div>

                  <div>
                    <label htmlFor="carName" className="block text-sm font-medium text-gray-700 mb-2">
                      Car Name/Model *
                    </label>
                    <input
                      id="carName"
                      type="text"
                      value={visitorForm.carName}
                      onChange={(e) => setVisitorForm({ ...visitorForm, carName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                      placeholder="e.g., Toyota Camry"
                    />
                  </div>
                </>
              )}

              {(visitorForm.visitType === 'delivery' || visitorForm.visitType === 'food_delivery') && (
                <div>
                  <label htmlFor="deliveryService" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Service *
                  </label>
                  <input
                    id="deliveryService"
                    type="text"
                    value={visitorForm.deliveryService}
                    onChange={(e) => setVisitorForm({ ...visitorForm, deliveryService: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    placeholder={
                      visitorForm.visitType === 'delivery'
                        ? 'e.g., Jumia, Konga, package delivery'
                        : 'e.g., Chowdeck, Glovo'
                    }
                  />
                </div>
              )}

              <div>
                <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until
                </label>
                <input
                  id="validUntil"
                  type="datetime-local"
                  value={visitorForm.validUntil}
                  onChange={(e) => setVisitorForm({ ...visitorForm, validUntil: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowVisitorModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Make Payment</h3>

            <form onSubmit={handleMakePayment} className="space-y-4">
              <div>
                <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Payment Type
                </label>
                <select
                  id="paymentType"
                  value={selectedPaymentType}
                  onChange={(e) => setSelectedPaymentType(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                >
                  <option value="">Choose a payment type</option>
                  {paymentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} - ₦{type.amount.toLocaleString()} ({type.frequency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
