import { useRef, useEffect, useState } from 'react';
import type { TimelineRow } from '../lib/types';

interface FrameRulerProps {
  durationFrames: number;
  fps: number;
  rows: TimelineRow[];
  selectedRowId: string | null;
  onRowFrameChange: (id: string, frame: number) => void;
  onRowClick: (id: string) => void;
}

const COLORS = ['#2563EB', '#D946EF', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

function componentColor(componentId: string): string {
  let hash = 0;
  for (let i = 0; i < componentId.length; i++) {
    hash = ((hash << 5) - hash) + componentId.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function FrameRuler({ durationFrames, fps, rows, selectedRowId, onRowFrameChange, onRowClick }: FrameRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; label: string } | null>(null);
  const [width, setWidth] = useState(800);
  const [dragFrame, setDragFrame] = useState<{ rowId: string; frame: number } | null>(null);
  const activeDragRef = useRef<{ rowId: string; startX: number; startFrame: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const frameToX = (frame: number) => (frame / durationFrames) * width;

  const ticks: number[] = [];
  for (let f = 0; f <= durationFrames; f += fps) ticks.push(f);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: '40px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {ticks.map(f => (
        <div key={f} style={{
          position: 'absolute', left: frameToX(f), top: 0,
          height: '12px', width: '1px', background: 'var(--color-border)',
        }} />
      ))}
      {ticks.map(f => (
        <span key={`l-${f}`} style={{
          position: 'absolute', left: frameToX(f) + 2, top: '14px',
          color: 'var(--color-text-secondary)', fontSize: '10px', pointerEvents: 'none',
        }}>
          {f}
        </span>
      ))}
      {rows.map(row => {
        const displayFrame = dragFrame?.rowId === row.id ? dragFrame.frame : row.frame;
        const color = componentColor(row.componentId);
        const isSelected = row.id === selectedRowId;
        return (
          <div
            key={row.id}
            onMouseEnter={() => {
              if (!activeDragRef.current) {
                setTooltip({ x: frameToX(displayFrame), label: `${row.componentId} / ${row.action} @ ${displayFrame}` });
              }
            }}
            onMouseLeave={() => setTooltip(null)}
            onPointerDown={e => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              activeDragRef.current = { rowId: row.id, startX: e.clientX, startFrame: row.frame };
              setTooltip(null);
            }}
            onPointerMove={e => {
              if (!activeDragRef.current || activeDragRef.current.rowId !== row.id) return;
              const deltaX = e.clientX - activeDragRef.current.startX;
              const newFrame = Math.max(0, Math.min(durationFrames, Math.round(
                activeDragRef.current.startFrame + (deltaX / width) * durationFrames
              )));
              setDragFrame({ rowId: row.id, frame: newFrame });
            }}
            onPointerUp={e => {
              if (!activeDragRef.current || activeDragRef.current.rowId !== row.id) return;
              const deltaX = Math.abs(e.clientX - activeDragRef.current.startX);
              if (deltaX < 4) {
                onRowClick(row.id);
              } else {
                const finalFrame = dragFrame?.rowId === row.id ? dragFrame.frame : row.frame;
                onRowFrameChange(row.id, finalFrame);
              }
              activeDragRef.current = null;
              setDragFrame(null);
            }}
            style={{
              position: 'absolute',
              left: frameToX(displayFrame) - 5,
              top: '4px',
              width: '10px',
              height: '10px',
              transform: 'rotate(45deg)',
              background: color,
              cursor: 'ew-resize',
              touchAction: 'none',
              zIndex: isSelected ? 2 : 1,
              boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 3px ${color}` : 'none',
            }}
          />
        );
      })}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 8, width - 160),
          top: '20px',
          background: 'var(--color-text-primary)',
          color: 'var(--color-surface)',
          padding: '2px 6px',
          borderRadius: '2px',
          fontSize: '11px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
