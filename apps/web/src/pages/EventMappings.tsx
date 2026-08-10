import { useState, useEffect } from 'react';
import { Trash2, Plus, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface ActionRef {
  actionId: string;
  delayMs: number;
  durationMs: number;
}

interface EventMapping {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  trigger: {
    type: string;
    giftId?: string;
    giftName?: string;
    minRepeatCount?: number;
    minTotalCoins?: number;
  };
  actions: ActionRef[];
  stopProcessingAfterMatch: boolean;
}

interface ActionDef {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  defaultDelayMs: number;
  defaultDurationMs: number;
  parameters: any;
}

export default function EventMappings() {
  const [mappings, setMappings] = useState<EventMapping[]>([]);
  const [actionDefs, setActionDefs] = useState<ActionDef[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for creating new mapping
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newGiftName, setNewGiftName] = useState('Rose');
  const [newMinCoins, setNewMinCoins] = useState(1);
  const [newMinRepeat, setNewMinRepeat] = useState(1);
  const [newSelectedActionId, setNewSelectedActionId] = useState('');
  const [newPriority, setNewPriority] = useState(10);

  const loadData = async () => {
    try {
      const mappingsData = await apiFetch('/v1/dashboard/event-mappings');
      const actionDefsData = await apiFetch('/v1/dashboard/action-definitions');
      if (mappingsData.success) {
        setMappings(mappingsData.eventMappings || []);
      }
      if (actionDefsData.success) {
        setActionDefs(actionDefsData.actionDefs || []);
        if (actionDefsData.actionDefs?.length > 0) {
          setNewSelectedActionId(actionDefsData.actionDefs[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh mục Event Mappings.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (map: EventMapping) => {
    try {
      setError('');
      setSuccessMsg('');
      const updated = { ...map, enabled: !map.enabled };
      
      const res = await apiFetch(`/v1/dashboard/event-mappings/${map.id}`, {
        method: 'PUT',
        body: JSON.stringify(updated)
      });

      if (res.success) {
        setMappings(res.eventMappings || []);
        setSuccessMsg(`Đã ${updated.enabled ? 'kích hoạt' : 'tắt'} quy tắc "${map.name}" thành công.`);
      }
    } catch (err: any) {
      setError(err.message || 'Không thay đổi được trạng thái quy tắc.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa quy tắc sự kiện này?')) return;
    try {
      setError('');
      setSuccessMsg('');
      const res = await apiFetch(`/v1/dashboard/event-mappings/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setMappings(res.eventMappings || []);
        setSuccessMsg('Đã xóa quy tắc sự kiện thành công.');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xóa quy tắc sự kiện.');
    }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapName.trim() || !newGiftName.trim() || !newSelectedActionId) {
      setError('Vui lòng nhập đầy đủ thông tin quy tắc.');
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      const payload: Partial<EventMapping> = {
        name: newMapName.trim(),
        description: `Tự động kích hoạt khi nhận được ${newGiftName}`,
        enabled: true,
        priority: Number(newPriority),
        trigger: {
          type: 'TIKTOK_GIFT',
          giftId: newGiftName.trim().toLowerCase(),
          giftName: newGiftName.trim(),
          minRepeatCount: Number(newMinRepeat),
          minTotalCoins: Number(newMinCoins)
        },
        actions: [
          {
            actionId: newSelectedActionId,
            delayMs: 0,
            durationMs: 5000
          }
        ],
        stopProcessingAfterMatch: true
      };

      const res = await apiFetch('/v1/dashboard/event-mappings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setMappings(res.eventMappings || []);
        setSuccessMsg(`Đã thêm quy tắc sự kiện "${payload.name}" thành công!`);
        setShowAddForm(false);
        setNewMapName('');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tạo quy tắc sự kiện.');
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '1px' }}>
          [HUD_03 // EVENT_ENGINE_MAPPINGS]
        </h2>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} />
          {showAddForm ? 'Hủy' : 'Thêm Quy Tắc'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--accent-red)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', color: '#fff' }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(0, 245, 155, 0.1)', border: '1px solid var(--accent-green)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} color="var(--accent-green)" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add New Mapping Form */}
      {showAddForm && (
        <div className="hud-panel" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            📝 Thiết lập quy tắc sự kiện quà tặng mới
          </div>
          <form onSubmit={handleAddMapping} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tên Quy Tắc</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Rose -> Mưa hoa hồng chớp neon" 
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Độ Ưu Tiên (Priority)</label>
              <input 
                type="number" 
                value={newPriority}
                onChange={(e) => setNewPriority(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tên Quà Tặng (TikTok Gift Name)</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Rose, Galaxy, Cap..." 
                value={newGiftName}
                onChange={(e) => setNewGiftName(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Số Xu Tối Thiểu (Min Coins)</label>
              <input 
                type="number" 
                value={newMinCoins}
                onChange={(e) => setNewMinCoins(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Lượt Tặng Tối Thiểu (Min Repeat)</label>
              <input 
                type="number" 
                value={newMinRepeat}
                onChange={(e) => setNewMinRepeat(Number(e.target.value))}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hành Động Kích Hoạt Trong Game</label>
              <select 
                value={newSelectedActionId} 
                onChange={(e) => setNewSelectedActionId(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#11131a', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#fff' }}
              >
                {actionDefs.map(act => (
                  <option key={act.id} value={act.id}>{act.name} ({act.type})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                Kích Hoạt Quy Tắc
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Left Column: Event Mappings */}
        <div className="hud-panel">
          <div className="panel-header-tech">
            <span className="panel-title-tech">ENGINE_01 // ACTIVE_MAPPINGS</span>
            <span className="panel-meta-tech">TOTAL: {mappings.length} RULES</span>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mappings.length > 0 ? (
              mappings.map(map => (
                <div key={map.id} style={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: map.enabled ? 1 : 0.6,
                  transition: 'opacity 0.2s'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="glow-text-pink" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {map.name}
                      </span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-blue)' }}>
                        Ưu tiên: {map.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Trigger: {map.trigger.giftName} (quà {map.trigger.giftId}) | Lặp tối thiểu: {map.trigger.minRepeatCount}x | Xu tối thiểu: {map.trigger.minTotalCoins}🪙
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {map.actions.map(actionRef => {
                        const def = actionDefs.find(a => a.id === actionRef.actionId);
                        return (
                          <span key={actionRef.actionId} style={{ fontSize: '0.7rem', background: 'rgba(157, 78, 221, 0.08)', border: '1px solid rgba(157, 78, 221, 0.2)', padding: '2px 8px', borderRadius: '4px', color: '#fff' }}>
                            ⚡ {def ? def.name : actionRef.actionId} ({actionRef.durationMs / 1000}s)
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                      onClick={() => handleToggle(map)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: map.enabled ? 'var(--accent-green)' : 'var(--text-muted)' }}
                      title={map.enabled ? "Tắt quy tắc" : "Kích hoạt quy tắc"}
                    >
                      {map.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleDelete(map.id)}
                      style={{ padding: '8px', minWidth: 'unset' }}
                      title="Xóa quy tắc"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                Chưa có quy tắc quà tặng nào được thiết lập.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Action Catalog */}
        <div className="hud-panel">
          <div className="panel-header-tech">
            <span className="panel-title-tech">CATALOG_01 // GAME_ACTIONS</span>
            <span className="panel-meta-tech">READ_ONLY ACTIONS CATALOG</span>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto' }}>
            {actionDefs.map(act => (
              <div key={act.id} style={{
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                    {act.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(0,245,155,0.08)', border: '1px solid rgba(0,245,155,0.2)', padding: '1px 5px', borderRadius: '4px', color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                    {act.type}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Độ trễ: {act.defaultDelayMs / 1000}s | Chạy trong: {act.defaultDurationMs / 1000}s
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '4px', background: 'rgba(0,0,0,0.15)', padding: '4px 8px', borderRadius: '4px' }}>
                  Params: {JSON.stringify(act.parameters)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
