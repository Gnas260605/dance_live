import { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Send, 
  Trash2, 
  SkipForward, 
  ShieldAlert, 
  Activity, 
  CheckCircle, 
  AlertTriangle,
  RotateCw,
  Compass,
  Gift,
  Music,
  User,
  Info
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

interface LogEntry {
  message: string;
  timestamp: string;
  isImportant?: boolean;
}

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

interface PreflightCheck {
  name: string;
  pass: boolean;
  detail: string;
}

interface DashboardState {
  isConnected: boolean;
  tiktokUsername: string;
  activePlayer: PlayerData | null;
  queue: PlayerData[];
  currentTheme: string;
  currentMusicId: string;
  selectedDanceId: string;
  selectedDanceStyle: string;
  selectedDanceName: string;
  isRobloxOnline: boolean;
  robloxHeartbeat: {
    lastHeartbeat: string;
    placeId: string;
    jobId: string;
    scriptVer: string;
  } | null;
  logs: LogEntry[];
}

export default function LiveControl() {
  // Connection states
  const [tiktokUser, setTiktokUser] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);

  // Simulation Form states
  const [mockUser, setMockUser] = useState('');
  const [mockCommentText, setMockCommentText] = useState('!dance Builderman');
  const [mockIsVIP, setMockIsVIP] = useState(false);

  const [mockGiftUser, setMockGiftUser] = useState('');
  const [mockGiftId, setMockGiftId] = useState('rose');
  const [mockGiftCount, setMockGiftCount] = useState(1);

  // Preflight
  const [preflight, setPreflight] = useState<PreflightCheck[] | null>(null);
  const [checkingPreflight, setCheckingPreflight] = useState(false);

  // Logs ref for auto scroll
  const logEndRef = useRef<HTMLDivElement>(null);

  // Polling for updates
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dashboard?.logs]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/dashboard/status`);
      const data = await res.json();
      if (data.success) {
        setDashboard(data.tenantStatus);
        if (data.tenantStatus.tiktokUsername && !tiktokUser) {
          setTiktokUser(data.tenantStatus.tiktokUsername);
        }
      }
    } catch (err) {
      console.error('Lỗi khi fetch status:', err);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiktokUser.trim()) return;
    setIsConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/v1/dashboard/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiktokUsername: tiktokUser.trim() })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/dashboard/disconnect`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkip = async () => {
    try {
      await fetch(`${API_BASE}/v1/dashboard/skip-dancer`, { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearQueue = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ hàng chờ?')) return;
    try {
      await fetch(`${API_BASE}/v1/dashboard/clear-queue`, { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await fetch(`${API_BASE}/v1/dashboard/emergency-stop`, { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/v1/dashboard/simulate-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktokUsername: mockUser.trim() || undefined,
          comment: mockCommentText.trim(),
          isVIP: mockIsVIP
        })
      });
      setMockCommentText('');
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateGift = async (e: React.FormEvent) => {
    e.preventDefault();
    const giftsList: Record<string, string> = {
      rose: 'Rose',
      lollipop: 'Lollipop',
      hand_heart: 'Hand Heart',
      galaxy: 'Galaxy'
    };
    try {
      await fetch(`${API_BASE}/v1/dashboard/simulate-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiktokUsername: mockGiftUser.trim() || undefined,
          giftId: mockGiftId,
          giftName: giftsList[mockGiftId] || 'Rose',
          repeatCount: mockGiftCount,
          diamondCount: mockGiftId === 'rose' ? 1 : mockGiftId === 'lollipop' ? 10 : mockGiftId === 'hand_heart' ? 100 : 1000
        })
      });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunPreflight = async () => {
    setCheckingPreflight(true);
    try {
      const res = await fetch(`${API_BASE}/v1/dashboard/preflight`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPreflight(data.checks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingPreflight(false);
    }
  };

  const getStatusText = () => {
    if (dashboard?.isConnected) return 'CONNECTED';
    if (isConnecting) return 'CONNECTING';
    return 'OFFLINE';
  };

  return (
    <div className="page-container">
      {/* Top Level Summary Row */}
      <div className="summary-cards-grid">
        <div className="hud-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(255, 0, 85, 0.1)', borderRadius: '10px', color: 'var(--accent-pink)' }}>
            <Tv size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>TIKTOK STREAM</div>
            <div className="glow-text-pink" style={{ fontSize: '1.15rem', fontWeight: 700, color: dashboard?.isConnected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
              {getStatusText()}
            </div>
          </div>
        </div>

        <div className="hud-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '10px', color: 'var(--accent-blue)' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>ROBLOX ENGINE</div>
            <div className="glow-text-blue" style={{ fontSize: '1.15rem', fontWeight: 700, color: dashboard?.isRobloxOnline ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {dashboard?.isRobloxOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </div>

        <div className="hud-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(157, 78, 221, 0.1)', borderRadius: '10px', color: 'var(--accent-purple)' }}>
            <User size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>QUEUE DEPTH</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {dashboard?.queue?.length || 0}
            </div>
          </div>
        </div>

        <div className="hud-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(255, 183, 3, 0.1)', borderRadius: '10px', color: 'var(--accent-yellow)' }}>
            <Music size={22} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>MUSIC AUDIO</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px', color: 'var(--accent-yellow)' }} title={dashboard?.currentMusicId}>
              {dashboard?.currentMusicId ? dashboard.currentMusicId.replace('rbxassetid://', 'ID: ') : 'NO MUSIC'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout Grid */}
      <div className="dashboard-grid">
        {/* Left Column (Queue & Controls) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Dancer & Action HUD */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <div className="panel-title-tech">[HUD_01 // ACTIVE_DANCER_STAGE]</div>
              <div className="panel-meta-tech">ROBLOX RECOGNITION INTERFACE</div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
                <button className="btn btn-secondary" onClick={handleSkip} disabled={!dashboard?.activePlayer && !dashboard?.queue.length} title="Bỏ qua Dancer hiện tại">
                  <SkipForward size={14} /> Skip
                </button>
                <button className="btn btn-danger" onClick={handleClearQueue} disabled={!dashboard?.queue.length} title="Clear queue">
                  <Trash2 size={14} /> Clear Queue
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ background: 'rgba(255, 51, 102, 0.18)', border: '1px solid var(--accent-red)' }} 
                  onClick={handleEmergencyStop}
                >
                  <ShieldAlert size={14} /> Emergency Stop
                </button>
              </div>

              {dashboard?.activePlayer ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', background: 'rgba(0,0,0,0.25)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  {/* Avatar Display Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '8px', padding: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: '#fff', marginBottom: '12px', boxShadow: '0 0 15px rgba(255, 0, 85, 0.4)' }}>
                      {dashboard.activePlayer.robloxUsername.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{dashboard.activePlayer.robloxUsername}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>@{dashboard.activePlayer.tiktokUsername}</div>
                    {dashboard.activePlayer.isVIP && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(255, 183, 3, 0.15)', border: '1px solid var(--accent-yellow)', color: 'var(--accent-yellow)', padding: '2px 8px', borderRadius: '8px', marginTop: '8px', fontWeight: 700, letterSpacing: '0.5px', fontFamily: 'var(--font-display)' }}>VIP PRIORITY</span>
                    )}
                  </div>

                  {/* Details info */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div className="tech-details-list">
                      <div className="tech-details-row">
                        <span className="tech-details-label">INTENT COMMAND:</span>
                        <span className="tech-details-val">
                          <code className="tech-mono-code">{dashboard.activePlayer.commentText}</code>
                        </span>
                      </div>
                      <div className="tech-details-row">
                        <span className="tech-details-label">DANCE TRACK:</span>
                        <span className="tech-details-val" style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>
                          {dashboard.activePlayer.danceName} <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 400 }}>({dashboard.activePlayer.danceStyle})</span>
                        </span>
                      </div>
                      <div className="tech-details-row">
                        <span className="tech-details-label">LUA VERIFICATION:</span>
                        <span className="tech-details-val" style={{ 
                          color: dashboard.activePlayer.danceVerification?.success ? 'var(--accent-green)' : 'var(--accent-yellow)',
                          fontSize: '0.85rem'
                        }}>
                          {dashboard.activePlayer.danceVerification?.message || 'Awaiting Roblox confirmation...'}
                        </span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                      <Info size={12} />
                      <span>UID: {dashboard.activePlayer.id} • TS: {new Date(dashboard.activePlayer.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '170px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '10px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                  <Compass size={36} style={{ marginBottom: '10px', opacity: 0.4, color: 'var(--accent-blue)' }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '1px' }}>STAGE VACANT</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Send comment "!dance username" to spawn avatar</div>
                </div>
              )}
            </div>
          </div>

          {/* Queue List */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <div className="panel-title-tech">[HUD_02 // WAITING_LIST_QUEUE]</div>
              <div className="panel-meta-tech">FIFO BUFFER STACK</div>
            </div>

            <div style={{ padding: '24px' }}>
              {dashboard?.queue && dashboard.queue.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {dashboard.queue.map((player, idx) => (
                    <div 
                      key={player.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '10px 16px', 
                        background: player.isVIP ? 'rgba(255, 183, 3, 0.03)' : 'rgba(255, 255, 255, 0.005)', 
                        border: player.isVIP ? '1px solid rgba(255, 183, 3, 0.15)' : '1px solid rgba(255, 255, 255, 0.02)', 
                        borderRadius: '8px' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', width: '20px' }}>#{String(idx + 1).padStart(2, '0')}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{player.robloxUsername}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>@{player.tiktokUsername}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <code className="tech-mono-code" style={{ fontSize: '0.75rem' }}>{player.commentText}</code>
                        {player.isVIP && (
                          <span style={{ fontSize: '0.6rem', background: 'rgba(255, 183, 3, 0.15)', color: 'var(--accent-yellow)', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>VIP</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                  QUEUE_BUFFER_EMPTY
                </div>
              )}
            </div>
          </div>

          {/* Interactive Simulation Dashboard Tools */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <div className="panel-title-tech">[HUD_03 // SANDBOX_STIMULATOR]</div>
              <div className="panel-meta-tech">LOCAL STREAM DEVIATION TESTBENCH</div>
            </div>

            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Comment Simulation Form */}
              <form onSubmit={handleSimulateComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid rgba(255,255,255,0.03)', paddingRight: '24px' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                  <Send size={14} color="var(--accent-pink)" /> CHAT INGESTION
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>SENDER USERNAME</label>
                  <input type="text" placeholder="viewer_roblox" value={mockUser} onChange={(e) => setMockUser(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>COMMENT TEXT</label>
                  <input type="text" placeholder="!dance Builderman" value={mockCommentText} onChange={(e) => setMockCommentText(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input type="checkbox" id="mockvip" checked={mockIsVIP} onChange={(e) => setMockIsVIP(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: 'var(--accent-pink)' }} />
                  <label htmlFor="mockvip" style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>Elevate to VIP Queue Priority</label>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                  Ingest Comment
                </button>
              </form>

              {/* Gift Simulation Form */}
              <form onSubmit={handleSimulateGift} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                  <Gift size={14} color="var(--accent-blue)" /> GIFT INGESTION
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>DONOR USERNAME</label>
                  <input type="text" placeholder="donor_roblox" value={mockGiftUser} onChange={(e) => setMockGiftUser(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>TIKTOK GIFT SELECTION</label>
                  <select value={mockGiftId} onChange={(e) => setMockGiftId(e.target.value)}>
                    <option value="rose">🌹 Rose (1 Coin)</option>
                    <option value="lollipop">🍭 Lollipop (10 Coins)</option>
                    <option value="hand_heart">🫶 Hand Heart (100 Coins)</option>
                    <option value="galaxy">🌌 Galaxy (1000 Coins)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>MULTIPLIER COUNT</label>
                  <input type="number" min="1" max="100" value={mockGiftCount} onChange={(e) => setMockGiftCount(parseInt(e.target.value) || 1)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '8px' }}>
                  Ingest Gift
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar Panels: Connect, Diagnostics, Logs) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* TikTok Live Stream Connection Control */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <div className="panel-title-tech">[HUD_04 // TIKTOK_BRIDGE]</div>
              <div className="panel-meta-tech">WEBCAST GATEWAY</div>
            </div>

            <div style={{ padding: '20px' }}>
              <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>TARGET TIKTOK LIVE USERNAME</label>
                  <input 
                    type="text" 
                    placeholder="e.g. sandg.music" 
                    value={tiktokUser} 
                    onChange={(e) => setTiktokUser(e.target.value)}
                    disabled={dashboard?.isConnected || isConnecting}
                    required 
                  />
                </div>
                {dashboard?.isConnected ? (
                  <button type="button" className="btn btn-danger" onClick={handleDisconnect} style={{ width: '100%' }}>
                    Terminate Connection
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isConnecting}>
                    {isConnecting ? (
                      <>
                        <RotateCw size={14} className="spinning" /> Synchronizing...
                      </>
                    ) : 'Initialize Link'}
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Preflight Diagnostics Panel */}
          <div className="hud-panel">
            <div className="panel-header-tech">
              <div className="panel-title-tech">[HUD_05 // PREFLIGHT_DIAGNOSTICS]</div>
              <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.65rem', minHeight: 'unset' }} onClick={handleRunPreflight} disabled={checkingPreflight}>
                Scan
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {preflight ? (
                preflight.map((check, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ marginTop: '2px' }}>
                      {check.pass ? (
                        <CheckCircle size={13} color="var(--accent-green)" />
                      ) : (
                        <AlertTriangle size={13} color="var(--accent-red)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: check.pass ? 'var(--text-primary)' : 'var(--accent-red)', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>{check.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{check.detail}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '8px', fontFamily: 'var(--font-mono)' }}>
                  AWAITING_DIAGNOSTICS_RUN
                </div>
              )}
            </div>
          </div>

          {/* Event Logs & Console Terminal */}
          <div className="hud-panel" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: '280px' }}>
            <div className="panel-header-tech">
              <div className="panel-title-tech">[HUD_06 // TERMINAL_OUTPUT]</div>
              <div className="panel-meta-tech">SYS_STREAM_STDOUT</div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <div style={{ 
                background: '#030406', 
                border: '1px solid rgba(255,255,255,0.02)', 
                borderRadius: '8px', 
                padding: '14px', 
                flexGrow: 1, 
                maxHeight: '300px', 
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                {dashboard?.logs && dashboard.logs.length > 0 ? (
                  dashboard.logs.map((log, idx) => (
                    <div key={idx} style={{ 
                      color: log.isImportant ? 'var(--accent-pink)' : '#e2e8f0',
                      borderBottom: '1px solid rgba(255,255,255,0.005)',
                      paddingBottom: '3px'
                    }}>
                      <span style={{ color: 'var(--accent-blue)', marginRight: '6px', opacity: 0.8 }}>
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      {log.message}
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>Console stream buffer silent...</div>
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
