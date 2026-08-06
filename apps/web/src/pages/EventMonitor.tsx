import { useState, useEffect } from 'react';
import { RefreshCw, Send, CheckCircle2, AlertOctagon, HelpCircle, XCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface GameEvent {
  eventId: string;
  mappingName: string;
  eventType: string;
  status: string;
  deliveryAttempts: number;
  createdAt: string;
  expiresAt: string;
  ackedAt?: string;
  actions: Array<{
    name: string;
    type: string;
  }>;
  context: {
    tiktokUsername: string;
    giftName: string;
    repeatCount: number;
  };
}

export default function EventMonitor() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchEvents = async () => {
    try {
      const res = await apiFetch('/v1/dashboard/events');
      if (res.success) {
        setEvents(res.history || []);
        setLastUpdated(new Date().toLocaleTimeString());
        setError('');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách sự kiện.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (eventId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/v1/dashboard/events/${eventId}/retry`, {
        method: 'POST'
      });
      if (res.success) {
        alert('Đã đưa sự kiện vào hàng đợi xử lý lại!');
        fetchEvents();
      }
    } catch (err: any) {
      alert('Không thể thử lại sự kiện: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACKED': return 'var(--accent-green)';
      case 'DELIVERED': return 'var(--accent-blue)';
      case 'QUEUED': return 'var(--accent-yellow)';
      case 'CANCELLED': return 'var(--text-muted)';
      case 'FAILED': return 'var(--accent-red)';
      default: return '#fff';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACKED': return <CheckCircle2 size={14} color="var(--accent-green)" />;
      case 'DELIVERED': return <Send size={14} color="var(--accent-blue)" />;
      case 'QUEUED': return <RefreshCw size={14} color="var(--accent-yellow)" className="animate-spin" />;
      case 'CANCELLED': return <XCircle size={14} color="var(--text-muted)" />;
      case 'FAILED': return <AlertOctagon size={14} color="var(--accent-red)" />;
      default: return <HelpCircle size={14} />;
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '1px' }}>
          [HUD_04 // LIVE_EVENTS_MONITOR]
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Cập nhật lúc: {lastUpdated || 'Chưa rõ'}</span>
          <button className="btn btn-secondary" onClick={fetchEvents} style={{ padding: '6px', minWidth: 'unset' }} title="Tải lại">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--accent-red)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', color: '#fff' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="hud-panel">
        <div className="panel-header-tech">
          <span className="panel-title-tech">MONITOR_01 // GAME_EVENTS_STREAM</span>
          <span className="panel-meta-tech">LATEST 100 EVENTS LOGS</span>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>Mã Sự Kiện</th>
                  <th style={{ padding: '12px 8px' }}>Quy Tắc Match</th>
                  <th style={{ padding: '12px 8px' }}>Chi Tiết TikTok Live</th>
                  <th style={{ padding: '12px 8px' }}>Hành Động Roblox</th>
                  <th style={{ padding: '12px 8px' }}>Thời Gian</th>
                  <th style={{ padding: '12px 8px' }}>Trạng Thái</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {events.length > 0 ? (
                  events.map(evt => (
                    <tr key={evt.eventId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', verticalAlign: 'middle' }}>
                      <td style={{ padding: '14px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {evt.eventId}
                      </td>
                      <td style={{ padding: '14px 8px', fontWeight: 'bold' }}>
                        {evt.mappingName}
                      </td>
                      <td style={{ padding: '14px 8px', color: 'var(--text-secondary)' }}>
                        @{evt.context?.tiktokUsername} tặng {evt.context?.repeatCount}x {evt.context?.giftName}
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {evt.actions?.map((act, i) => (
                            <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px' }}>
                              {act.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: getStatusColor(evt.status), fontWeight: 'bold', fontSize: '0.75rem' }}>
                          {getStatusIcon(evt.status)}
                          <span>{evt.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                        {(evt.status === 'FAILED' || evt.status === 'CANCELLED') ? (
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleRetry(evt.eventId)}
                            disabled={loading}
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          >
                            Chạy lại
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Chưa ghi nhận sự kiện tương tác game nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
