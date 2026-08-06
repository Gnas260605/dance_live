import { useState, useEffect } from 'react';
import { 
  Tv, 
  UserCheck, 
  Disc, 
  Sparkles, 
  Settings as SettingsIcon, 
  Monitor,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders
} from 'lucide-react';
import LiveControl from './pages/LiveControl';
import Dancers from './pages/Dancers';
import EventMonitor from './pages/EventMonitor';
import EventMappings from './pages/EventMappings';
import MusicLibrary from './pages/MusicLibrary';
import DanceEmotes from './pages/DanceEmotes';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { getAuthToken, setAuthToken, setStoredUser, getStoredUser, apiFetch } from './lib/api';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [robloxOnline, setRobloxOnline] = useState(false);
  
  // Auth state
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [user, setUser] = useState<any>(getStoredUser());
  
  // Routing tab state
  const [activeTab, setActiveTab] = useState<'live' | 'dancers' | 'events' | 'monitor' | 'music' | 'dances' | 'settings'>('live');

  useEffect(() => {
    if (!token) return;
    
    const pollBadges = async () => {
      try {
        const data = await apiFetch('/v1/dashboard/status');
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
  }, [token]);

  const handleLoginSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'live':
        return <LiveControl />;
      case 'dancers':
        return <Dancers />;
      case 'events':
        return <EventMappings />;
      case 'monitor':
        return <EventMonitor />;
      case 'music':
        return <MusicLibrary />;
      case 'dances':
        return <DanceEmotes />;
      case 'settings':
        return <Settings />;
      default:
        return <LiveControl />;
    }
  };

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
          <li className={`sidebar-item ${activeTab === 'live' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('live'); }}>
              <Tv size={18} color={activeTab === 'live' ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
              {!isSidebarCollapsed && <span>Live Control</span>}
            </a>
          </li>

          <li className={`sidebar-item ${activeTab === 'dancers' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('dancers'); }}>
              <UserCheck size={18} color={activeTab === 'dancers' ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
              {!isSidebarCollapsed && <span>Dancers</span>}
            </a>
          </li>

          <li className={`sidebar-item ${activeTab === 'events' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('events'); }}>
              <Sliders size={18} color={activeTab === 'events' ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
              {!isSidebarCollapsed && <span>Event Mappings</span>}
            </a>
          </li>

          <li className={`sidebar-item ${activeTab === 'monitor' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('monitor'); }}>
              <Monitor size={18} color={activeTab === 'monitor' ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
              {!isSidebarCollapsed && <span>Event Monitor</span>}
            </a>
          </li>

          <li className={`sidebar-item ${activeTab === 'music' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('music'); }}>
              <Disc size={18} color={activeTab === 'music' ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
              {!isSidebarCollapsed && <span>Music Library</span>}
            </a>
          </li>

          <li className={`sidebar-item ${activeTab === 'dances' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('dances'); }}>
              <Sparkles size={18} color={activeTab === 'dances' ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
              {!isSidebarCollapsed && <span>Dance Emotes</span>}
            </a>
          </li>

          <li className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}>
              <SettingsIcon size={18} color={activeTab === 'settings' ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
              {!isSidebarCollapsed && <span>Settings</span>}
            </a>
          </li>

          <li className="sidebar-item" style={{ marginTop: 'auto' }}>
            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ color: 'var(--accent-red)' }}>
              <LogOut size={18} />
              {!isSidebarCollapsed && <span>Đăng Xuất</span>}
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
          <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Creator Control Center</span>
            {user && (
              <span style={{ 
                fontSize: '0.7rem', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border-color)', 
                padding: '2px 8px', 
                borderRadius: '4px',
                color: 'var(--text-secondary)'
              }}>
                {user.name} ({user.planTier})
              </span>
            )}
          </div>

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

        <main style={{ flexGrow: 1, overflowY: 'auto' }}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
