import { useState, useEffect } from 'react';
import { Sparkles, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Dance {
  id: string;
  name: string;
  danceId: string;
  genre: string;
  danceStyle: string;
  verificationStatus: string;
}

export default function DanceEmotes() {
  const [dances, setDances] = useState<Dance[]>([]);
  const [selectedDanceId, setSelectedDanceId] = useState('');
  const [scanUsername, setScanUsername] = useState('');
  const [scanSetActive, setScanSetActive] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDances = async () => {
    try {
      const res = await apiFetch('/v1/dashboard/dance');
      if (res.success) {
        setDances(res.verifiedDances || []);
        setSelectedDanceId(res.selectedDanceId || '');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải thư viện điệu nhảy.');
    }
  };

  useEffect(() => {
    loadDances();
  }, []);

  const handleSelectDance = async (dance: Dance) => {
    try {
      setError('');
      setSuccess('');
      const res = await apiFetch('/v1/dashboard/dance', {
        method: 'POST',
        body: JSON.stringify({ danceId: dance.danceId, setActive: true })
      });
      if (res.success) {
        setSelectedDanceId(res.selectedDanceId);
        setSuccess(`Đã kích hoạt điệu nhảy "${dance.name}" làm điệu nhảy chính!`);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể chọn điệu nhảy chính.');
    }
  };

  const handleScanInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanUsername.trim()) {
      setError('Vui lòng nhập tên tài khoản Roblox cần quét.');
      return;
    }

    setError('');
    setSuccess('');
    setScanLoading(true);

    try {
      const res = await apiFetch('/v1/dashboard/dance/scan', {
        method: 'POST',
        body: JSON.stringify({ 
          username: scanUsername.trim(), 
          setActive: scanSetActive 
        })
      });

      if (res.success) {
        setDances(res.dances || []);
        if (res.selectedDanceId) {
          setSelectedDanceId(res.selectedDanceId);
        }
        setSuccess(res.message || 'Đã đồng bộ điệu nhảy thành công!');
        setScanUsername('');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi quét kho đồ Roblox.');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '1px' }}>
        [HUD_06 // DANCE_EMOTES_CONSOLE]
      </h2>

      {error && (
        <div style={{ background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--accent-red)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(0, 245, 155, 0.1)', border: '1px solid var(--accent-green)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="var(--accent-green)" />
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Left Column: Dance List */}
        <div className="hud-panel">
          <div className="panel-header-tech">
            <span className="panel-title-tech">EMOTES_01 // VERIFIED_DANCE_LIBRARY</span>
            <span className="panel-meta-tech">TOTAL: {dances.length} VERIFIED DANCES</span>
          </div>

          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
            {dances.map(dance => {
              const isSelected = selectedDanceId === dance.danceId;
              return (
                <div key={dance.id} style={{
                  padding: '14px',
                  background: isSelected ? 'rgba(0, 240, 255, 0.04)' : 'rgba(255,255,255,0.01)',
                  border: isSelected ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--accent-blue)' : '#fff' }}>
                        {dance.name}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        {dance.genre}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      {dance.danceId}
                    </div>
                  </div>

                  <button 
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSelectDance(dance)}
                    style={{ fontSize: '0.7rem', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Sparkles size={12} />
                    {isSelected ? 'Đang Kích Hoạt' : 'Chọn Làm Điệu Nhảy Chính'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Scan Roblox Inventory */}
        <div className="hud-panel" style={{ height: 'fit-content' }}>
          <div className="panel-header-tech">
            <span className="panel-title-tech">SCAN_01 // ROBLOX_USER_INVENTORY</span>
            <span className="panel-meta-tech">AUTO SCAN FOR DANCES</span>
          </div>

          <div style={{ padding: '20px' }}>
            <form onSubmit={handleScanInventory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Tên Tài Khoản Roblox (Username)
                </label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Builderman" 
                  value={scanUsername}
                  onChange={(e) => setScanUsername(e.target.value)}
                  disabled={scanLoading}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="scanSetActive"
                  checked={scanSetActive}
                  onChange={(e) => setScanSetActive(e.target.checked)}
                  disabled={scanLoading}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-blue)' }}
                />
                <label htmlFor="scanSetActive" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Kích hoạt điệu nhảy tìm thấy làm mặc định ngay
                </label>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={scanLoading}
                style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: scanLoading ? 'not-allowed' : 'pointer' }}
              >
                {scanLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Đang quét kho đồ...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Quét & Nhập Điệu Nhảy
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', lineHeight: '1.4' }}>
              ℹ️ <strong>Hướng dẫn:</strong> Hệ thống sẽ tự động quét kho đồ công khai của tài khoản Roblox bạn cung cấp để tìm các animation điệu nhảy hợp lệ và thêm chúng vào thư viện này.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
