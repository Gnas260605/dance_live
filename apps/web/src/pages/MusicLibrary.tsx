import { useState, useEffect } from 'react';
import { Music, Plus, Play, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Track {
  id: string;
  name: string;
  musicId: string;
}

export default function MusicLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentMusicId, setCurrentMusicId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSoundId, setNewSoundId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMusic = async () => {
    try {
      const res = await apiFetch('/v1/dashboard/music-library');
      if (res.success) {
        setTracks(res.tracks || []);
        setCurrentMusicId(res.currentMusicId || '');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách nhạc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMusic();
  }, []);

  const handlePlayNow = async (track: Track) => {
    try {
      setError('');
      setSuccess('');
      const res = await apiFetch('/v1/dashboard/music', {
        method: 'POST',
        body: JSON.stringify({ name: track.name, musicId: track.musicId })
      });
      if (res.success) {
        setCurrentMusicId(res.currentMusicId);
        setSuccess(`Đã kích hoạt phát ngay SoundID: "${track.name}"`);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể đổi nhạc phát ngay.');
    }
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSoundId.trim()) {
      setError('Vui lòng nhập đầy đủ tên và SoundID.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await apiFetch('/v1/dashboard/music-library', {
        method: 'POST',
        body: JSON.stringify({ name: newTitle.trim(), musicId: newSoundId.trim() })
      });
      if (res.success) {
        setTracks(res.tracks || []);
        if (res.currentMusicId) {
          setCurrentMusicId(res.currentMusicId);
        }
        setSuccess(`Đã thêm bài hát "${newTitle}" vào thư viện thành công!`);
        setNewTitle('');
        setNewSoundId('');
      }
    } catch (err: any) {
      setError(err.message || 'Không thêm được bài hát.');
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '1px' }}>
        [HUD_05 // MUSIC_LIBRARY]
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
        {/* Left Column: Playlist */}
        <div className="hud-panel">
          <div className="panel-header-tech">
            <span className="panel-title-tech">PLAYLIST_01 // CUSTOM_TRACKS</span>
            <span className="panel-meta-tech">TOTAL: {tracks.length} PHONK SOUNDIDS</span>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tracks.length > 0 ? (
              tracks.map(track => {
                const isPlaying = currentMusicId === track.musicId;
                return (
                  <div key={track.id} style={{
                    padding: '14px 18px',
                    background: isPlaying ? 'rgba(157, 78, 221, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                    border: isPlaying ? '1px solid rgba(157, 78, 221, 0.3)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Music size={16} color={isPlaying ? 'var(--accent-pink)' : 'var(--text-secondary)'} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isPlaying ? '#fff' : 'var(--text-primary)' }}>
                          {track.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {track.musicId}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={`btn ${isPlaying ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handlePlayNow(track)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px' }}
                      >
                        <Play size={12} fill={isPlaying ? '#fff' : 'none'} />
                        {isPlaying ? 'Đang Phát' : 'Phát Ngay'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                Chưa có SoundID nhạc nào trong thư viện custom.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add Form */}
        <div className="hud-panel" style={{ height: 'fit-content' }}>
          <div className="panel-header-tech">
            <span className="panel-title-tech">ADD_01 // NEW_SOUNDID_TRACK</span>
            <span className="panel-meta-tech">ROBLOX ASSET CHECKED</span>
          </div>

          <div style={{ padding: '20px' }}>
            <form onSubmit={handleAddTrack} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tên Bài Hát</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Phonk Metamorphosis" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Roblox SoundID (hoặc URL)</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: 1837879082" 
                  value={newSoundId}
                  onChange={(e) => setNewSoundId(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px 14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Plus size={16} />
                Thêm Vào Thư Viện
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
