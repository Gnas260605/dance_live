import { useState, useEffect } from 'react';
import { Trash2, SkipForward, Users, Activity, Clock, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface PlayerData {
  id: string;
  robloxUsername: string;
  tiktokUsername: string;
  commentText: string;
  animationId: string;
  danceStyle: string;
  danceName: string;
  isVIP: boolean;
  timestamp: number;
  danceVerification?: {
    success: boolean;
    mode: string;
    message: string;
    verifiedAt: string | null;
  };
}

export default function Dancers() {
  const [activePlayer, setActivePlayer] = useState<PlayerData | null>(null);
  const [queue, setQueue] = useState<PlayerData[]>([]);
  const [danceDuration, setDanceDuration] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await apiFetch('/v1/dashboard/status');
      if (data.success) {
        setActivePlayer(data.tenantStatus.activePlayer);
        setQueue(data.tenantStatus.queue || []);
        setDanceDuration(data.tenantStatus.danceDuration || 12);
        setLastUpdated(new Date().toLocaleTimeString());
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải trạng thái hàng chờ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSkip = async () => {
    try {
      setLoading(true);
      await apiFetch('/v1/dashboard/skip-dancer', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      alert('Không bỏ qua được dancer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearQueue = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ hàng chờ?')) return;
    try {
      setLoading(true);
      await apiFetch('/v1/dashboard/clear-queue', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      alert('Không xóa được hàng chờ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '1px' }}>
          [HUD_02 // QUEUE_MANAGER]
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Cập nhật lúc: {lastUpdated || 'Chưa rõ'}</span>
          <button className="btn btn-secondary" onClick={fetchStatus} style={{ padding: '6px', minWidth: 'unset' }} title="Tải lại ngay">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--accent-red)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
        {/* Active Dancer Panel */}
        <div className="hud-panel" style={{ height: 'fit-content' }}>
          <div className="panel-header-tech">
            <span className="panel-title-tech">STAGE_01 // ACTIVE_DANCER</span>
            <span className="panel-meta-tech">ROBLOX VERIFY ACTIVE</span>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activePlayer ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    background: 'rgba(0, 240, 255, 0.05)',
                    border: '1px solid var(--accent-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-neon-blue)'
                  }}>
                    <Activity size={32} color="var(--accent-blue)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                      @{activePlayer.robloxUsername}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Tài khoản TikTok: @{activePlayer.tiktokUsername}
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Điệu nhảy:</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{activePlayer.danceName}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Thời lượng:</span>
                      <span style={{ fontWeight: 600 }}>{danceDuration} giây</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Trạng thái xác minh:</span>
                    <span style={{ color: activePlayer.danceVerification?.success ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                      {activePlayer.danceVerification?.message || 'Chờ xác nhận...'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button className="btn btn-secondary" onClick={handleSkip} disabled={loading} style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <SkipForward size={16} />
                    Bỏ qua Dancer
                  </button>
                  <button className="btn btn-danger" onClick={handleClearQueue} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', minWidth: 'unset' }} title="Xóa toàn bộ hàng chờ">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <Clock size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.85rem' }}>Không có Dancer nào đang nhảy trên sân khấu.</p>
              </div>
            )}
          </div>
        </div>

        {/* Queue List Panel */}
        <div className="hud-panel">
          <div className="panel-header-tech">
            <span className="panel-title-tech">QUEUE_01 // PENDING_DANCERS</span>
            <span className="panel-meta-tech">TOTAL: {queue ? queue.length : 0} PLAYERS</span>
          </div>

          <div style={{ padding: '20px' }}>
            {queue && queue.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {queue.map((player, idx) => (
                  <div key={player.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    transition: 'border-color 0.2s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(157, 78, 221, 0.1)',
                        border: '1px solid rgba(157, 78, 221, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: 'var(--accent-purple)'
                      }}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                          @{player.robloxUsername}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          TikTok: @{player.tiktokUsername} | Comment: "{player.commentText}"
                        </div>
                      </div>
                    </div>
                    {player.isVIP && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        color: 'var(--accent-yellow)',
                        border: '1px solid rgba(255, 183, 3, 0.3)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: 'rgba(255, 183, 3, 0.05)'
                      }}>
                        VIP
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <Users size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.85rem' }}>Hàng chờ trống. Bình luận "!dance + Tên Roblox" để tham gia.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
