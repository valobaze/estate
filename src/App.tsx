import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import TenantRegister from './components/TenantRegister';
import LandlordRegister from './components/LandlordRegister';
import LandlordDashboard from './components/LandlordDashboard';
import TenantDashboard from './components/TenantDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import AdminDashboard from './components/AdminDashboard';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [registerView, setRegisterView] = useState<'tenant' | 'landlord' | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    if (registerView === 'tenant') {
      return <TenantRegister onBack={() => setRegisterView(null)} />;
    }
    if (registerView === 'landlord') {
      return <LandlordRegister onBack={() => setRegisterView(null)} />;
    }
    return (
      <Login
        onSwitchToRegister={() => setRegisterView('tenant')}
        onSwitchToLandlordRegister={() => setRegisterView('landlord')}
      />
    );
  }

  switch (profile.role) {
    case 'landlord':
      return <LandlordDashboard />;
    case 'tenant':
      return <TenantDashboard />;
    case 'security':
      return <SecurityDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-red-600">Invalid user role</p>
        </div>
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
