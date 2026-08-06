import { useState, useEffect } from 'react';
import { 
  Tv, 
  UserCheck, 
  Disc, 
  Sparkles, 
  Settings, 
  Monitor,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import LiveControl from './pages/LiveControl';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [robloxOnline, setRobloxOnline] = useState(false);

  useEffect(() => {
    // Poll basic status for header badges
    const pollBadges = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/dashboard/status`);
        const data = await res.json();
        if (data.success) {
          setTiktokConnected(data.tenantStatus.isConnected);
          setRobloxOnline(data.tenantStatus.isRobloxOnline);
        }
      } catch (err) {
        // Silent error
      }
    };
    
    pollBadges();
    const interval = setInterval(pollBadges, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Premium Sidebar Layout */}
      <aside className="sidebar" style={{ width: isSidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}>
        <div className="sidebar-logo">
          {!isSidebarCollapsed ? (
            <span className="glow-text-pink">DANCE LIVE</span>
          ) : (
            <span className="glow-text-pink">DL</span>
          )}
        </div>

        <ul className="sidebar-menu">
          <li className="sidebar-item active">
            <a href="#" onClick={(e) => e.preventDefault()}>
              <Tv size={18} color="var(--accent-pink)" />
              {!isSidebarCollapsed && <span>Live Control</span>}
            </a>
          </li>

          {/* Placeholders for upcoming pages (marked as disabled placeholders according to Rules) */}
          <li className="sidebar-item" style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Tính năng sẽ ra mắt ở Phase 4">
            <a href="#" onClick={(e) => e.preventDefault()}>
              <UserCheck size={18} />
              {!isSidebarCollapsed && <span>Dancers [Phase 4]</span>}
            </a>
          </li>

          <li className="sidebar-item" style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Tính năng sẽ ra mắt ở Phase 4">
            <a href="#" onClick={(e) => e.preventDefault()}>
              <Monitor size={18} />
              {!isSidebarCollapsed && <span>Event Monitor [P4]</span>}
            </a>
          </li>

          <li className="sidebar-item" style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Tính năng sẽ ra mắt ở Phase 4">
            <a href="#" onClick={(e) => e.preventDefault()}>
              <Disc size={18} />
              {!isSidebarCollapsed && <span>Music Library [P4]</span>}
            </a>
          </li>

          <li className="sidebar-item" style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Tính năng sẽ ra mắt ở Phase 4">
            <a href="#" onClick={(e) => e.preventDefault()}>
              <Sparkles size={18} />
              {!isSidebarCollapsed && <span>Dance Emotes [P4]</span>}
            </a>
          </li>

          <li className="sidebar-item" style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Tính năng sẽ ra mắt ở Phase 4">
            <a href="#" onClick={(e) => e.preventDefault()}>
              <Settings size={18} />
              {!isSidebarCollapsed && <span>Settings [Phase 4]</span>}
            </a>
          </li>
        </ul>

        {/* Collapse Button */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '8px', minWidth: 'unset', width: '36px', height: '36px' }}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="main-content" style={{ marginLeft: isSidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}>
        <header className="app-header">
          <div className="header-title">Creator Control Center</div>

          <div className="status-badges">
            <div className="status-badge" title="Trạng thái kết nối TikTok Live">
              <span style={{ color: 'var(--text-secondary)' }}>TikTok Live:</span>
              <div className={`status-dot ${tiktokConnected ? 'active' : 'inactive'}`} />
              <span style={{ fontWeight: 600 }}>{tiktokConnected ? 'LIVE' : 'DISCONNECTED'}</span>
            </div>

            <div className="status-badge" title="Trạng thái kết nối Roblox game server">
              <span style={{ color: 'var(--text-secondary)' }}>Roblox Engine:</span>
              <div className={`status-dot ${robloxOnline ? 'active' : 'inactive'}`} />
              <span style={{ fontWeight: 600 }}>{robloxOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </header>

        <main style={{ flexGrow: 1 }}>
          <LiveControl />
        </main>
      </div>
    </div>
  );
}
