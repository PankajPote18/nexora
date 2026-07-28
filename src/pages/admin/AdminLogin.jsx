import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Minimal admin login — calls the real, already-existing POST /api/legacy-auth/login
// (the consumer-facing login is a frontend-only demo now, see
// src/hooks/useAuth.js — it doesn't call the backend at all, so /api/auth
// isn't mounted here anymore either) and stores a real JWT under
// 'adminAuthToken'. Not currently wired into any upload flow (all uploads now
// go through the unauthenticated POST /api/upload, see upload.routes.js) —
// kept as a standalone real-auth page; it does not gate the rest of
// /admin/*, which remains as it was.
const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/legacy-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      if (data.user?.role !== 'admin') {
        throw new Error('This account does not have admin access.');
      }
      localStorage.setItem('adminAuthToken', data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1220] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#141a29] border border-gray-800 rounded-xl p-8 space-y-5">
        <h1 className="text-xl font-bold text-white text-center">ClickBuz Admin Login</h1>
        <p className="text-xs text-gray-500 text-center">Required to upload movie/trailer files.</p>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-gray-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1a2234] border border-gray-700 text-white rounded px-4 py-2.5 outline-none focus:border-[#4aa5ff]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1a2234] border border-gray-700 text-white rounded px-4 py-2.5 outline-none focus:border-[#4aa5ff]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded bg-[#5a6ef7] text-white font-medium hover:bg-[#4f61de] transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
