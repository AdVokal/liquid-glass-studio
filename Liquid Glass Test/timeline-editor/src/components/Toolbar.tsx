interface ToolbarProps {
  durationFrames: number;
  fps: number;
  isDirty: boolean;
  onAdd: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function Toolbar({ durationFrames, fps, isDirty, onAdd, onUndo, onRedo, onSave, canUndo, canRedo }: ToolbarProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: '40px',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.08em' }}>
          TIMELINE EDITOR
        </span>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {durationFrames} fr / {fps} fps
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onAdd}>+ Add Row</button>
        <button onClick={onUndo} disabled={!canUndo} title="Ctrl+Z">↩ Undo</button>
        <button onClick={onRedo} disabled={!canRedo} title="Ctrl+Y">↪ Redo</button>
        <button
          onClick={onSave}
          title="Ctrl+S"
          style={isDirty ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}}
        >
          {isDirty ? '● Save*' : '● Save'}
        </button>
      </div>
    </div>
  );
}
