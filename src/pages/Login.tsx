import { apiUrl } from '../config/api';
import React, { useState } from 'react';
import { User } from '../types';

import { 
  Activity, 
  ShieldAlert, 
  KeyRound, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Settings,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  BadgeAlert,
  HardHat,
  Users,
  Briefcase,
  Info
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Sign In state
  const [email, setEmail] = useState('admin@refinery.safe');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ message: string; type: 'pending' | 'rejected' | 'deactivated' | 'auth' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration state
  const [regName, setRegName] = useState('');
  const [regIdNumber, setRegIdNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regRole, setRegRole] = useState<'Employee' | 'Officer' | 'Manager'>('Employee');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const handleAdminQuickFill = () => {
    setEmail('admin@refinery.safe');
    setPassword('password123');
    setError(null);
  };

  // ── localStorage auth helpers ─────────────────────────────────────────────

  const getLocalUsers = (): User[] => {
    try {
      const raw = localStorage.getItem('raksha_local_users');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };

  const saveLocalUsers = (users: User[]) => {
    try { localStorage.setItem('raksha_local_users', JSON.stringify(users)); } catch {}
  };

  const ensureDefaultAdmin = () => {
    const users = getLocalUsers();
    const hasAdmin = users.some(u => u.email === 'admin@refinery.safe');
    if (!hasAdmin) {
      users.push({
        id: 1,
        email: 'admin@refinery.safe',
        name: 'System Admin',
        role: 'Admin',
        id_number: 'ADM-001',
        phone: '',
        address: '',
        approval_status: 'Approved',
        is_active: true,
        token: 'token-admin-admin@refinery.safe',
        // @ts-ignore
        password: 'password123',
      });
      saveLocalUsers(users);
    }
    return getLocalUsers();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError({ message: 'Please enter your email and password.', type: 'auth' });
      return;
    }

    setLoading(true);
    setError(null);

    const payloadEmail = email.trim();
    const payloadPassword = password;

    // Short delay for UX feel
    await new Promise(r => setTimeout(r, 300));

    try {
      // Try real backend first (if running)
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payloadEmail, password: payloadPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          id_number: data.id_number,
          phone: data.phone,
          address: data.address,
          approval_status: data.approval_status,
          token: data.token
        });
        return;
      }

      if (response.status !== 0) {
        const errData = await response.json().catch(() => ({ detail: 'Authentication failed.' }));
        const detailMsg = errData.detail || 'Authentication failed.';
        if (response.status === 403 && detailMsg.toLowerCase().includes('pending')) {
          setError({ message: detailMsg, type: 'pending' });
        } else if (response.status === 403 && detailMsg.toLowerCase().includes('rejected')) {
          setError({ message: detailMsg, type: 'rejected' });
        } else if (response.status === 403 && detailMsg.toLowerCase().includes('deactivated')) {
          setError({ message: detailMsg, type: 'deactivated' });
        } else {
          setError({ message: detailMsg, type: 'auth' });
        }
        return;
      }
    } catch {
      // Backend offline — fall through to local auth
    }

    // ── Local (offline) auth ──────────────────────────────────────────────────
    const users = ensureDefaultAdmin();
    // @ts-ignore
    const found = users.find(u => u.email === payloadEmail && u.password === payloadPassword);
    if (!found) {
      setError({ message: 'Invalid email or password.', type: 'auth' });
      setLoading(false);
      return;
    }
    const foundAny = found as User & { approval_status?: string; is_active?: boolean };
    if (foundAny.approval_status === 'Pending') {
      setError({ message: 'Your account is pending approval by the System Administrator.', type: 'pending' });
      setLoading(false);
      return;
    }
    if (foundAny.approval_status === 'Rejected') {
      setError({ message: 'Your account registration has been rejected.', type: 'rejected' });
      setLoading(false);
      return;
    }
    if (foundAny.is_active === false) {
      setError({ message: 'Your account has been deactivated.', type: 'deactivated' });
      setLoading(false);
      return;
    }

    onLoginSuccess({
      id: found.id,
      email: found.email,
      name: found.name,
      role: found.role,
      id_number: found.id_number,
      phone: found.phone,
      address: found.address,
      approval_status: foundAny.approval_status,
      token: found.token || `token-${found.role?.toLowerCase().replace(/\s+/g, '-')}-${found.email}`,
    });
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regIdNumber || !regEmail || !regPassword) {
      setRegError('Please complete all required fields.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    await new Promise(r => setTimeout(r, 300));

    try {
      // Try real backend first
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          id_number: regIdNumber.trim(),
          email: regEmail.trim(),
          password: regPassword,
          phone: regPhone.trim(),
          address: regAddress.trim(),
          role: regRole
        }),
      });

      if (response.ok) {
        setRegSuccess(`Registration submitted for ${regName}! Your account has been registered with status PENDING approval. The System Administrator will review and approve your account in the Admin Console before you can sign in.`);
        setRegName(''); setRegIdNumber(''); setRegEmail(''); setRegPassword(''); setRegPhone(''); setRegAddress(''); setRegRole('Employee');
        setRegLoading(false);
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (response.status !== 0) {
        throw new Error((data as { detail?: string }).detail || 'Registration failed.');
      }
    } catch (err: unknown) {
      // If it's a real backend error, show it
      if (err instanceof Error && !err.message.includes('fetch')) {
        setRegError(err.message);
        setRegLoading(false);
        return;
      }
      // Backend offline — register locally
    }

    // ── Local (offline) registration ──────────────────────────────────────────
    const users = ensureDefaultAdmin();
    if (users.some(u => u.email === regEmail.trim())) {
      setRegError('An account with this email already exists.');
      setRegLoading(false);
      return;
    }

    const newUser = {
      id: Date.now(),
      email: regEmail.trim(),
      password: regPassword,
      name: regName.trim(),
      role: regRole,
      id_number: regIdNumber.trim(),
      phone: regPhone.trim(),
      address: regAddress.trim(),
      approval_status: 'Pending',
      is_active: false,
      token: `token-${regRole.toLowerCase().replace(/\s+/g, '-')}-${regEmail.trim()}`,
    };
    users.push(newUser);
    saveLocalUsers(users);

    setRegSuccess(`Registration submitted for ${regName}! Your account is PENDING approval. The System Administrator can approve it in the Admin Console.`);
    setRegName(''); setRegIdNumber(''); setRegEmail(''); setRegPassword(''); setRegPhone(''); setRegAddress(''); setRegRole('Employee');
    setRegLoading(false);
  };


  return (
    <div className="min-h-screen flex font-sans antialiased text-slate-900 bg-slate-900">
      
      {/* Left Column: Industrial Facility Hero Panel (40% width) */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden bg-slate-950">
        <img 
          src="/refinery_hero.jpg" 
          alt="Industrial Refinery Operations" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-all duration-700 hover:scale-100"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-blue-950/40"></div>
        
        {/* Branding & Architecture Info */}
        <div className="relative z-10 p-12 flex flex-col justify-between h-full text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#008779] flex items-center justify-center text-white shadow-lg shadow-[#008779]/30">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                SIF-SHIELD AI
              </span>
            </div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-2">
              High-Consequence Safety Intelligence Platform
            </p>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Governed Onboarding & RBAC System</span>
            </div>

            <h2 className="text-3xl font-extrabold leading-tight text-white tracking-tight">
              From Safety Observations to Early Incident Warning.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Enterprise security with strict Role-Based Access Control. All field employees, safety officers, and managers register for verification and must be approved by the System Administrator before accessing operational portals.
            </p>

            {/* Platform Role Overview */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
              <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <HardHat className="h-3.5 w-3.5" />
                  <span>Employee</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Worker Safety Portal & Reporting</div>
              </div>
              <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Officer</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">SIF Audits, Triage & Field Actions</div>
              </div>
              <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Manager</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">HSE Command & Safety Directives</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center justify-between">
            <span>System Master: System Admin</span>
            <span>OIL & Refinery Fleet Standard</span>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication & Onboarding Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16 bg-slate-50 font-sans overflow-y-auto">
        <div className="mx-auto w-full max-w-md">
          
          {/* Header & Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#008779]/10 text-[#008779] border border-[#008779]/20">
                Enterprise Portal
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === 'signin' ? 'Sign In to Portal' : 'New User Onboarding'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {activeTab === 'signin' 
                ? 'Authenticate with your authorized credentials or use System Admin access.' 
                : 'Register your account. Newly registered users require System Admin approval.'}
            </p>

            {/* Switchable Tabs */}
            <div className="flex p-1 bg-slate-200/80 rounded-2xl mt-5 border border-slate-300/60">
              <button
                type="button"
                onClick={() => { setActiveTab('signin'); setError(null); }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register (Onboarding)</span>
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: SIGN IN FORM */}
          {/* ======================================================== */}
          {activeTab === 'signin' && (
            <div>
              {/* Status & Error Alerts */}
              {error && (
                <div className={`mb-5 p-4 text-xs font-semibold rounded-2xl flex items-start gap-3 border ${
                  error.type === 'pending'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : error.type === 'rejected'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : error.type === 'deactivated'
                    ? 'bg-purple-50 border-purple-300 text-purple-900'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  {error.type === 'pending' ? (
                    <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-extrabold uppercase text-[10px] tracking-wider mb-0.5">
                      {error.type === 'pending' 
                        ? 'Registration Pending Admin Approval' 
                        : error.type === 'rejected' 
                        ? 'Registration Rejected' 
                        : error.type === 'deactivated' 
                        ? 'Account Deactivated' 
                        : 'Authentication Notice'}
                    </div>
                    <div>{error.message}</div>
                    
                    {error.type === 'pending' && (
                      <div className="mt-2.5 text-[11px] text-amber-900 bg-amber-100/70 p-2.5 rounded-xl border border-amber-200 leading-relaxed font-medium flex items-start gap-1.5">
                        <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                        <span><strong>In Admin Request Queue:</strong> Your registration request is visible to the System Administrator in the <strong>Admin Master Console</strong>. Once approved, you will be able to log in immediately.</span>
                      </div>
                    )}

                    {error.message.toLowerCase().includes('register') && (
                      <button
                        type="button"
                        onClick={() => {
                          setRegEmail(email.trim());
                          setActiveTab('register');
                          setError(null);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#008779] hover:bg-[#007064] text-white text-[11px] font-bold rounded-xl transition cursor-pointer shadow-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Register '{email}' & Submit Admin Request</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Registration Success Banner on Sign-in page */}
              {regSuccess && (
                <div className="mb-5 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="font-black text-emerald-800 uppercase text-[10px] tracking-wider mb-0.5">Registration Sent to Admin Queue</div>
                    <div>{regSuccess}</div>
                  </div>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSignIn}>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@refinery.safe"
                      className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#008779] focus:border-[#008779] text-sm text-slate-900 placeholder-slate-400 bg-white font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Account Password
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#008779] focus:border-[#008779] text-sm text-slate-900 placeholder-slate-400 bg-white font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-xs font-extrabold text-white bg-[#008779] hover:bg-[#007064] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#008779] transition disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Validating Authorization...' : 'Sign In to Portal'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {/* Seeded System Admin Quick Fill */}
              <div className="mt-8 border-t border-slate-200 pt-5">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Pre-Seeded Master Credentials
                </div>
                
                <button
                  type="button"
                  onClick={handleAdminQuickFill}
                  className="w-full p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-[#008779] rounded-2xl transition shadow-2xs group cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black text-slate-900 group-hover:text-[#008779]">
                        System Admin (Master)
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">admin@refinery.safe</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                    Seeded Admin
                  </span>
                </button>

                <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">
                  Other roles (Employee, Officer, Manager) must register via the Onboarding tab and be approved by the System Administrator before accessing their portal.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: REGISTER / ONBOARDING FORM */}
          {/* ======================================================== */}
          {activeTab === 'register' && (
            <div>
              {regError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-900">Registration Submitted!</h3>
                    <p className="text-xs text-emerald-800 mt-2 font-medium leading-relaxed">
                      Your application has been received with status <strong className="font-bold uppercase tracking-wider bg-emerald-100 px-1.5 py-0.5 rounded">Pending Approval</strong>.
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      The System Administrator must review your ID, role, and details in the Admin Console before access is granted.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signin'); setRegSuccess(null); }}
                    className="px-5 py-2.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <form className="space-y-3.5" onSubmit={handleRegister}>
                  {/* Full Name & ID Number */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        ID No. (Emp/Off/Mgr) *
                      </label>
                      <input
                        type="text"
                        value={regIdNumber}
                        onChange={(e) => setRegIdNumber(e.target.value)}
                        placeholder="e.g. EMP-2041"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]"
                        required
                      />
                    </div>
                  </div>

                  {/* Email & Password */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@refinery.safe"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone & Address */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                        Work Location / Address
                      </label>
                      <input
                        type="text"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        placeholder="Refinery Area / Quarters"
                        className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]"
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="block text-[10.5px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                      Requested Platform Role *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Employee', label: 'Employee', desc: 'Worker Portal' },
                        { id: 'Officer', label: 'Officer', desc: 'Safety Audits' },
                        { id: 'Manager', label: 'Manager', desc: 'HSE Command' }
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRegRole(r.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            regRole === r.id
                              ? 'bg-[#E8F6F4] border-[#008779] text-[#008779]'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-extrabold">{r.label}</div>
                          <div className="text-[9px] text-slate-500">{r.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note on approval */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[10.5px] text-amber-900 flex items-start gap-2">
                    <BadgeAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Newly registered accounts are placed in <strong>Pending</strong> status. The System Administrator will verify your credentials in the Admin Panel before your login is enabled.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 px-4 rounded-xl shadow-md text-xs font-extrabold text-white bg-[#008779] hover:bg-[#007064] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{regLoading ? 'Submitting Application...' : 'Submit Onboarding Request'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            SIF-SHIELD AI Precursor Intelligence Platform
          </div>
        </div>
      </div>

    </div>
  );
};
