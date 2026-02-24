import { useState, useRef, useCallback } from 'react';
import type { TimelineRow, ComponentRegistry } from '../lib/types';
import { frameToTimecode, timecodeToFrame, generateId } from '../lib/utils';

interface TimelineTableProps {
  rows: TimelineRow[];
  fps: number;
  registry: ComponentRegistry | null;
  onChange: (rows: TimelineRow[]) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  rowIndex: number;
}

interface AutocompleteState {
  rowId: string;
  query: string;
  open: boolean;
}

export default function TimelineTable({ rows, fps, registry, onChange }: TimelineTableProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [autocomplete, setAutocomplete] = useState<AutocompleteState | null>(null);
  const dragSourceRef = useRef<number | null>(null);

  const updateRow = useCallback((id: string, patch: Partial<TimelineRow>) => {
    onChange(rows.map(r => r.id === id ? { ...r, ...patch } : r));
  }, [rows, onChange]);

  const deleteRow = useCallback((index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  }, [rows, onChange]);

  const insertRow = useCallback((index: number) => {
    const newRow: TimelineRow = {
      id: generateId(),
      frame: 0,
      componentId: registry?.components[0]?.id ?? '',
      action: registry?.components[0]?.actions[0]?.id ?? '',
      params: {},
    };
    const next = [...rows];
    next.splice(index, 0, newRow);
    onChange(next);
  }, [rows, registry, onChange]);

  const getComponentMeta = (id: string) =>
    registry?.components.find(c => c.id === id || c.displayName === id);

  const getActionDef = (componentId: string, actionId: string) =>
    getComponentMeta(componentId)?.actions.find(a => a.id === actionId);

  const autocompleteOptions = (query: string) => {
    if (!registry) return [];
    if (!query) return registry.components.map(c => ({ id: c.id, label: c.displayName }));
    const q = query.toLowerCase();
    return registry.components
      .filter(c => c.id.toLowerCase().includes(q) || c.displayName.toLowerCase().includes(q))
      .map(c => ({ id: c.id, label: c.displayName }));
  };

  const CELL_STYLE: React.CSSProperties = {
    padding: '0 8px',
    borderRight: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  };

  return (
    <div
      style={{ flex: 1, overflow: 'auto' }}
      onClick={() => setContextMenu(null)}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '28px' }} />
          <col style={{ width: '80px' }} />
          <col style={{ width: '110px' }} />
          <col style={{ width: '160px' }} />
          <col style={{ width: '140px' }} />
          <col />
          <col style={{ width: '32px' }} />
        </colgroup>
        <thead>
          <tr style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}>
            {['≡', 'FRAME', 'TIME', 'COMPONENT', 'ACTION', 'PARAMS', '×'].map(h => (
              <th key={h} style={{
                ...CELL_STYLE,
                height: 'var(--row-height)',
                textAlign: 'left',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: 'var(--color-text-secondary)',
                borderRight: h !== '×' ? '1px solid var(--color-border)' : 'none',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const compMeta = getComponentMeta(row.componentId);
            const actionDef = getActionDef(row.componentId, row.action);
            const isACOpen = autocomplete?.rowId === row.id && autocomplete.open;

            return (
              <tr
                key={row.id}
                draggable
                onDragStart={() => { dragSourceRef.current = index; }}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={() => {
                  if (dragSourceRef.current === null || dragSourceRef.current === index) return;
                  const next = [...rows];
                  const [moved] = next.splice(dragSourceRef.current, 1);
                  next.splice(index, 0, moved);
                  onChange(next);
                  dragSourceRef.current = null;
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, rowIndex: index });
                }}
                style={{
                  height: 'var(--row-height)',
                  borderBottom: '1px solid var(--color-border)',
                  background: index % 2 === 0 ? 'var(--color-bg)' : 'var(--color-surface)',
                }}
              >
                <td style={{ ...CELL_STYLE, cursor: 'grab', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                  ≡
                </td>

                <td style={CELL_STYLE}>
                  <input
                    type="number"
                    value={row.frame}
                    min={0}
                    onChange={e => updateRow(row.id, { frame: Number(e.target.value) })}
                  />
                </td>

                <td style={CELL_STYLE}>
                  <input
                    type="text"
                    value={frameToTimecode(row.frame, fps)}
                    onChange={e => {
                      const f = timecodeToFrame(e.target.value, fps);
                      if (!isNaN(f) && f >= 0) updateRow(row.id, { frame: f });
                    }}
                    placeholder="00:00:00:00"
                  />
                </td>

                <td style={{ ...CELL_STYLE, position: 'relative' }}>
                  <input
                    type="text"
                    value={isACOpen ? autocomplete.query : (compMeta?.displayName ?? row.componentId)}
                    onFocus={() => setAutocomplete({ rowId: row.id, query: compMeta?.displayName ?? row.componentId, open: true })}
                    onChange={e => setAutocomplete({ rowId: row.id, query: e.target.value, open: true })}
                    onBlur={() => setTimeout(() => setAutocomplete(null), 150)}
                    placeholder="Component..."
                  />
                  {isACOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      zIndex: 100,
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}>
                      {autocompleteOptions(autocomplete.query).map(opt => (
                        <div
                          key={opt.id}
                          onMouseDown={() => {
                            const firstAction = registry?.components.find(c => c.id === opt.id)?.actions[0]?.id ?? '';
                            updateRow(row.id, { componentId: opt.id, action: firstAction, params: {} });
                            setAutocomplete(null);
                          }}
                          style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                <td style={CELL_STYLE}>
                  <select
                    value={row.action}
                    onChange={e => updateRow(row.id, { action: e.target.value, params: {} })}
                    style={{ width: '100%' }}
                  >
                    {(compMeta?.actions ?? []).map(a => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                    {!compMeta && <option value={row.action}>{row.action}</option>}
                  </select>
                </td>

                <td style={CELL_STYLE}>
                  {actionDef && actionDef.params.length > 0 ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {actionDef.params.map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}>
                          {p.label}:
                          <input
                            type={p.type === 'number' ? 'number' : 'text'}
                            value={String(row.params[p.id] ?? p.default)}
                            min={p.min}
                            max={p.max}
                            onChange={e => {
                              const val: number | string = p.type === 'number' ? Number(e.target.value) : e.target.value;
                              updateRow(row.id, { params: { ...row.params, [p.id]: val } });
                            }}
                            style={{ width: p.type === 'number' ? '60px' : '80px' }}
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                  )}
                </td>

                <td style={{ padding: 0, textAlign: 'center' }}>
                  <button
                    onClick={() => deleteRow(index)}
                    style={{ border: 'none', color: 'var(--color-text-secondary)', padding: '0 8px', width: '100%', height: 'var(--row-height)' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          No events. Click "+ Add Row" to add one.
        </div>
      )}

      {contextMenu && (
        <div style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          zIndex: 1000,
          minWidth: '160px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}>
          {[
            { label: 'Insert row above', action: () => insertRow(contextMenu.rowIndex) },
            { label: 'Insert row below', action: () => insertRow(contextMenu.rowIndex + 1) },
            { label: 'Delete', action: () => deleteRow(contextMenu.rowIndex) },
          ].map(item => (
            <div
              key={item.label}
              onClick={() => { item.action(); setContextMenu(null); }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid var(--color-border)',
                color: item.label === 'Delete' ? '#DC2626' : 'var(--color-text-primary)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
