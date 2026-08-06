import { useState } from 'react';
import { Shield, Mail, Lock, User, Info } from 'lucide-react';
import { setAuthToken, setStoredUser } from '../lib/api';

const API_BASE = window.location.origin.includes('5173') ? 'http://localhost:3001/api' : '/api';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (isRegister && !name.trim())) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password };
      
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đã có lỗi xảy ra.');
      }

      setAuthToken(data.token);
      setStoredUser(data.user);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative',
      zIndex: 5
    }}>
      <div className="hud-panel" style={{ width: '100%', maxWidth: '420px', padding: '30px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '12px', 
            borderRadius: '50%', 
            background: 'rgba(255, 0, 85, 0.08)',
            border: '1px solid rgba(255, 0, 85, 0.2)',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-neon-pink)'
          }}>
            <Shield size={32} color="var(--accent-pink)" />
          </div>
          <h2 className="glow-text-pink" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', letterSpacing: '2px' }}>
            {isRegister ? 'REGISTER CREATOR' : 'CREATOR LOGIN'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>
            {isRegister ? 'Tạo tài khoản console điều khiển stream mới' : 'Đăng nhập vào bảng điều khiển stream S&G Music'}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 51, 102, 0.1)',
            border: '1px solid var(--accent-red)',
            padding: '12px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.8rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Info size={16} color="var(--accent-red)" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Họ và tên
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nguyễn Văn A" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    transition: 'border-color 0.2s'
                  }}
                />
                <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Địa chỉ Email
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                className="form-input" 
                placeholder="creator@sgmusic.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.9rem',
                  transition: 'border-color 0.2s'
                }}
              />
              <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.9rem',
                  transition: 'border-color 0.2s'
                }}
              />
              <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{
              padding: '12px',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-display)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              width: '100%',
              marginTop: '10px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'ĐANG XỬ LÝ...' : (isRegister ? 'TẠO TÀI KHOẢN' : 'ĐĂNG NHẬP')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}
