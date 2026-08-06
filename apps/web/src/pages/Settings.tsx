import { useState, useEffect } from 'react';
import { Eye, EyeOff, Clipboard, Check, Save, Shield } from 'lucide-react';
import { apiFetch, getStoredUser } from '../lib/api';

export default function Settings() {
  const user = getStoredUser();
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Settings states
  const [danceDuration, setDanceDuration] = useState(12);
  const [robloxSession, setRobloxSession] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = async () => {
    try {
      const statusData = await apiFetch('/v1/dashboard/status');
      if (statusData.success) {
        setDanceDuration(statusData.tenantStatus.danceDuration || 12);
        setRobloxSession(statusData.tenantStatus.robloxHeartbeat || null);
        if (statusData.user && statusData.user.apiKey) {
          setApiKey(statusData.user.apiKey);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải thiết lập.');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await apiFetch('/v1/dashboard/settings', {
        method: 'POST',
        body: JSON.stringify({ danceDuration })
      });
      if (res.success) {
        setSuccess('Đã lưu cấu hình livestream thành công.');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể lưu thiết lập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '1px' }}>
        [HUD_07 // CONSOLE_SETTINGS]
      </h2>

      {error && (
        <div style={{ background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--accent-red)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(0, 245, 155, 0.1)', border: '1px solid var(--accent-green)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} color="var(--accent-green)" />
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Left Column: API & Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* API Key Panel */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <span className="panel-title-tech">CREDENTIALS_01 // ACCESS_KEYS</span>
              <span className="panel-meta-tech">MULTI-TENANT API KEY</span>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Sử dụng API Key này để xác thực máy chủ Roblox Studio của bạn với Backend API server. Hãy giữ an toàn cho khóa này.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{
                  flexGrow: 1,
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  color: showKey ? '#fff' : 'var(--text-muted)'
                }}>
                  <span>{showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}</span>
                </div>
                <button className="btn btn-secondary" onClick={() => setShowKey(!showKey)} style={{ padding: '8px', minWidth: 'unset', width: '42px', height: '42px' }}>
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button className="btn btn-primary" onClick={handleCopyKey} style={{ padding: '8px', minWidth: 'unset', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {copied ? <Check size={16} /> : <Clipboard size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Config Settings Panel */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <span className="panel-title-tech">CONFIG_01 // STREAM_PARAMETERS</span>
              <span className="panel-meta-tech">LIVESTREAM BEHAVIOR</span>
            </div>

            <div style={{ padding: '20px' }}>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Thời gian nhảy mỗi lượt (giây)
                  </label>
                  <input 
                    type="number" 
                    min={5}
                    max={120}
                    value={danceDuration}
                    onChange={(e) => setDanceDuration(Math.max(5, Math.min(120, parseInt(e.target.value) || 5)))}
                    disabled={loading}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '6px' }}>
                    Mỗi dancer sẽ có số giây này trên sân khấu trước khi tự động chuyển sang dancer tiếp theo (mặc định: 12 giây).
                  </small>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'fit-content', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={16} />
                  Lưu Thiết Lập
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Roblox Connection Info & Docs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Roblox session info */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <span className="panel-title-tech">ROBLOX_01 // DIAGNOSTICS</span>
              <span className="panel-meta-tech">LATEST GAME HEARTBEAT</span>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {robloxSession && robloxSession.lastHeartbeat ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Trạng thái:</span>
                    <span style={{ color: robloxSession.isOnline ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                      {robloxSession.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Roblox Place ID:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{robloxSession.placeId || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Roblox Job ID:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', overflow: 'hidden', maxWidth: '140px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={robloxSession.jobId}>
                      {robloxSession.jobId || 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Phiên bản Script:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{robloxSession.scriptVer || '1.0.0'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Heartbeat cuối:</span>
                    <span>{new Date(robloxSession.lastHeartbeat).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Chưa nhận được heartbeat nào từ Roblox game server.
                </div>
              )}
            </div>
          </div>

          {/* Guide setup */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <span className="panel-title-tech">DOCS_01 // SETUP_GUIDE</span>
              <span className="panel-meta-tech">LUA INTEGRATION</span>
            </div>

            <div style={{ padding: '20px', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                <Shield size={14} color="var(--accent-pink)" />
                KÍCH HOẠT SCRIPTS TRONG ROBLOX:
              </div>
              <p>1. Mở Roblox Studio game của bạn.</p>
              <p>2. Dán mã nguồn Lua script của S&G Music vào ServerScriptService.</p>
              <p>3. Mở cài đặt Script, nhập biến config:</p>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '6px 10px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-blue)',
                border: '1px solid var(--border-color)',
                marginTop: '4px'
              }}>
                API_KEY = "API_KEY_CỦA_BẠN"
              </pre>
              <p style={{ marginTop: '4px' }}>4. Bật <strong>Allow HTTP Requests</strong> trong Roblox Game Settings để hoàn thành kết nối.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
