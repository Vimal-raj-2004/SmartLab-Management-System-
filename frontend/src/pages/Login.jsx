import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Monitor, Lock, Mail, AlertCircle, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, getRoleDashboardPath } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userInfo = await login(email, password);
      const targetPath = getRoleDashboardPath(userInfo.role);
      navigate(targetPath, { replace: true });
    } catch (err) {
      console.error(err);
      if (!err.response) {
        setError('Cannot connect to backend server. Please ensure FastAPI is running on port 8000.');
      } else if (err.response.status === 504 || err.response.status === 502) {
        setError('Backend server gateway timeout or unavailable. Please check if uvicorn is running.');
      } else if (err.response.status === 404 || typeof err.response.data === 'string') {
        setError('Backend API server not found (404). Netlify only hosts the frontend (React). The FastAPI backend must be deployed (e.g. Render) or tested locally on http://localhost:5173.');
      } else {
        setError(
          err.response?.data?.detail ||
          'Invalid email or password. Please verify your credentials.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (uEmail, uPass) => {
    setEmail(uEmail);
    setPassword(uPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/10">
            <Monitor className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-white">
          Smart Computer Lab System
        </h2>
        <p className="mt-1.5 text-center text-sm text-slate-400">
          Sign in to access your role-specific portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@lab.edu"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-11 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/20 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-400">
                New Student?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline">
                  Create Student Account &rarr;
                </Link>
              </p>
            </div>
          </form>

          {/* 1-Click Quick-Fill Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Test Accounts (1-Click Fill)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@lab.edu', 'admin123')}
                className="text-left p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all text-xs"
              >
                <div className="font-semibold text-purple-400">1. Admin</div>
                <div className="text-[11px] text-slate-500 truncate">admin@lab.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('faculty@lab.edu', 'faculty123')}
                className="text-left p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-xs"
              >
                <div className="font-semibold text-blue-400">2. Faculty</div>
                <div className="text-[11px] text-slate-500 truncate">faculty@lab.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('assistant@lab.edu', 'assistant123')}
                className="text-left p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-xs"
              >
                <div className="font-semibold text-amber-400">3. Lab Assistant</div>
                <div className="text-[11px] text-slate-500 truncate">assistant@lab.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('student@lab.edu', 'student123')}
                className="text-left p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs"
              >
                <div className="font-semibold text-emerald-400">4. Student</div>
                <div className="text-[11px] text-slate-500 truncate">student@lab.edu</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('support@lab.edu', 'assistant123')}
                className="text-left p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-xs col-span-2"
              >
                <div className="font-semibold text-cyan-400">⚡ Tech Support Sam (Assigned Tech)</div>
                <div className="text-[11px] text-slate-500 truncate">support@lab.edu</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
