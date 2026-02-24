import { useRef, useEffect, useState } from 'react';
import type { TimelineRow } from '../lib/types';

interface FrameRulerProps {
  durationFrames: number;
  fps: number;
  rows: TimelineRow[];
}

export default function FrameRuler({ durationFrames, fps, rows }: FrameRulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; label: string } | null>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const frameToX = (frame: number) => (frame / durationFrames) * width;

  const ticks: number[] = [];
  for (let f = 0; f <= durationFrames; f += fps) {
    ticks.push(f);
  }

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
      }}
    >
      {ticks.map(f => (
        <div key={f} style={{
          position: 'absolute',
          left: frameToX(f),
          top: 0,
          height: '12px',
          width: '1px',
          background: 'var(--color-border)',
        }} />
      ))}
      {ticks.map(f => (
        <span key={`label-${f}`} style={{
          position: 'absolute',
          left: frameToX(f) + 2,
          top: '14px',
          color: 'var(--color-text-secondary)',
          fontSize: '10px',
        }}>
          {f}
        </span>
      ))}
      {rows.map(row => (
        <div
          key={row.id}
          onMouseEnter={() => setTooltip({ x: frameToX(row.frame), label: `${row.componentId} / ${row.action} @ ${row.frame}` })}
          onMouseLeave={() => setTooltip(null)}
          style={{
            position: 'absolute',
            left: frameToX(row.frame) - 5,
            top: '4px',
            width: '10px',
            height: '10px',
            transform: 'rotate(45deg)',
            background: 'var(--color-accent)',
            cursor: 'default',
          }}
        />
      ))}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 8,
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
