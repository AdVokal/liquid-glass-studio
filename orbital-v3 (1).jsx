import { useState, useEffect, useRef, useCallback } from "react";

// ─── Size definitions ──────────────────────────────────────────────────────
const SIZES = ["XS", "S", "M", "L", "XL"];
const SIZE_DIMS = {
  XS: { w: 82,  h: 52  },
  S:  { w: 128, h: 78  },
  M:  { w: 182, h: 108 },
  L:  { w: 240, h: 140 },
  XL: { w: 308, h: 174 },
};

// ─── UID ────────────────────────────────────────────────────────────────────
let _uid = 0;
const uid = () => ++_uid;

function makeWidget(order, sizeIndex = 1) {
  return { id: uid(), order, sizeIndex };
}

// ─── Core geometry: area-based angular distribution ─────────────────────────
// Each widget's angular footprint ∝ its bounding diagonal.
// Total circumference = sum of footprints → radius derived from that.
function computeTargets(widgets, gap, orbitPad) {
  if (widgets.length === 0) return { targets: {}, radius: 180 };

  const sorted = [...widgets].sort((a, b) => a.order - b.order);

  // Footprint = half-diagonal + half-gap (both sides)
  const halfDiags = sorted.map(w => {
    const d = SIZE_DIMS[SIZES[w.sizeIndex]];
    return Math.sqrt(d.w * d.w + d.h * d.h) / 2;
  });

  // Minimum circumference so arc ≥ footprint for each slot
  const totalArc = halfDiags.reduce((s, v) => s + v * 2 + gap, 0);
  const radius = Math.max(160, totalArc / (Math.PI * 2) + orbitPad);

  // Distribute angles proportionally
  const targets = {};
  let accumulated = -Math.PI / 2; // start top
  sorted.forEach((w, i) => {
    const slotArc = halfDiags[i] * 2 + gap;
    const span    = slotArc / (radius * Math.PI * 2) * Math.PI * 2; // angle span
    const angle   = accumulated + span / 2;
    targets[w.id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, angle };
    accumulated   += span;
  });

  return { targets, radius };
}

// ─── Widget component (pure visual, no physics logic) ─────────────────────
function WidgetPanel({ w, px, py, isDragging, onMouseDown }) {
  const [hover, setHover] = useState(false);
  const dims = SIZE_DIMS[SIZES[w.sizeIndex]];

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute",
        left:   px - dims.w / 2,
        top:    py - dims.h / 2,
        width:  dims.w,
        height: dims.h,
        borderRadius: 22,
        border: `1px solid rgba(255,255,255,${isDragging ? 0.42 : hover ? 0.28 : 0.14})`,
        background: isDragging
          ? "rgba(255,255,255,0.08)"
          : hover
          ? "rgba(255,255,255,0.055)"
          : "rgba(255,255,255,0.028)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: isDragging
          ? "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.2)"
          : hover
          ? "0 12px 48px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.1)"
          : "0 4px 24px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.055)",
        cursor: isDragging ? "grabbing" : "grab",
        transition: [
          "width 0.6s cubic-bezier(0.34,1.45,0.64,1)",
          "height 0.6s cubic-bezier(0.34,1.45,0.64,1)",
          "border-color 0.22s",
          "background 0.22s",
          "box-shadow 0.22s",
        ].join(", "),
        userSelect: "none",
        zIndex: isDragging ? 300 : hover ? 10 : 2,
        willChange: "left, top, width, height",
        // Internal layout
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "11px 14px",
      }}
    >
      {/* Top inset shimmer */}
      <div style={{
        position: "absolute", top: 0, left: 20, right: 20, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,${hover ? 0.18 : 0.08}), transparent)`,
        transition: "background 0.22s",
      }} />

      {/* Corner registration marks */}
      {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([cx, cy], i) => (
        <div key={i} style={{
          position: "absolute",
          width: 10, height: 10,
          top:    cy === -1 ? 8 : undefined,
          bottom: cy ===  1 ? 8 : undefined,
          left:   cx === -1 ? 8 : undefined,
          right:  cx ===  1 ? 8 : undefined,
          pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute",
            top:    cy === -1 ? 0 : undefined,
            bottom: cy ===  1 ? 0 : undefined,
            left:   cx === -1 ? 0 : undefined,
            right:  cx ===  1 ? 0 : undefined,
            width: 6, height: 1,
            background: `rgba(255,255,255,${isDragging ? 0.5 : hover ? 0.32 : 0.18})`,
            transition: "background 0.22s",
          }} />
          <div style={{
            position: "absolute",
            top:    cy === -1 ? 0 : undefined,
            bottom: cy ===  1 ? 0 : undefined,
            left:   cx === -1 ? 0 : undefined,
            right:  cx ===  1 ? 0 : undefined,
            width: 1, height: 6,
            background: `rgba(255,255,255,${isDragging ? 0.5 : hover ? 0.32 : 0.18})`,
            transition: "background 0.22s",
          }} />
        </div>
      ))}

      {/* Size badge */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", flex: 1 }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 9,
          letterSpacing: "0.16em",
          color: `rgba(255,255,255,${isDragging ? 0.55 : hover ? 0.38 : 0.2})`,
          transition: "color 0.22s",
        }}>
          {SIZES[w.sizeIndex]}
        </span>
      </div>
    </div>
  );
}

// ─── Slider component ──────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 0.01, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 8, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontSize: 9, letterSpacing: "0.06em", color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{
          position: "absolute", left: 0, right: 0, height: 1,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 1,
        }} />
        <div style={{
          position: "absolute", left: 0, width: `${pct}%`, height: 1,
          background: "rgba(255,255,255,0.45)",
          borderRadius: 1,
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            position: "absolute", left: 0, right: 0,
            width: "100%", opacity: 0, cursor: "pointer",
            height: 20, margin: 0,
          }}
        />
        <div style={{
          position: "absolute",
          left: `calc(${pct}% - 5px)`,
          width: 10, height: 10,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.85)",
          boxShadow: "0 0 8px rgba(255,255,255,0.4)",
          pointerEvents: "none",
          transition: "left 0.05s",
        }} />
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function OrbitalUI() {
  // Widgets state
  const [widgets, setWidgets] = useState(() =>
    Array.from({ length: 8 }, (_, i) => makeWidget(i, i % SIZES.length))
  );

  // Controls
  const [gap,            setGap]            = useState(28);
  const [orbitPad,       setOrbitPad]       = useState(40);
  const [stiffness,      setStiffness]      = useState(0.042);
  const [damping,        setDamping]        = useState(0.76);
  const [repulsion,      setRepulsion]      = useState(3.5);
  const [breatheSpeed,   setBreatheSpeed]   = useState(0.6);
  const [breatheScale,   setBreatheScale]   = useState(0.06);
  const [showPanel,      setShowPanel]      = useState(false);

  // Live params ref (avoids stale closure in RAF)
  const paramsRef = useRef({ gap, orbitPad, stiffness, damping, repulsion });
  useEffect(() => {
    paramsRef.current = { gap, orbitPad, stiffness, damping, repulsion };
  }, [gap, orbitPad, stiffness, damping, repulsion]);

  // Physics store
  const phy = useRef({});  // id → {x, y, vx, vy}
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  // Drag state
  const drag = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const reorderClock = useRef(0);
  const frameRef = useRef(null);

  // Breathing
  const timeRef = useRef(0);
  const [breathe, setBreathe] = useState(0); // 0..1 sin

  // Render trigger
  const [tick, setTick] = useState(0);

  // ── Seed / prune physics ──
  const syncPhysics = useCallback((ws) => {
    const p = paramsRef.current;
    const { targets, radius } = computeTargets(ws, p.gap, p.orbitPad);
    ws.forEach(w => {
      if (!phy.current[w.id]) {
        const t = targets[w.id] || { x: 0, y: 0 };
        // Spawn from center with outward burst
        phy.current[w.id] = {
          x: 0, y: 0,
          vx: t.x * 0.15, vy: t.y * 0.15,
        };
      }
    });
    const ids = new Set(ws.map(w => w.id));
    Object.keys(phy.current).forEach(k => {
      if (!ids.has(Number(k))) delete phy.current[k];
    });
  }, []);

  useEffect(() => { syncPhysics(widgets); }, [widgets, syncPhysics]);

  // ── RAF loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    let last = performance.now();

    const loop = (now) => {
      const dt = Math.min((now - last) / 16.67, 3); // normalized to 60fps
      last = now;
      timeRef.current += dt;

      const p = paramsRef.current;
      const ws = widgetsRef.current;
      const { targets } = computeTargets(ws, p.gap, p.orbitPad);

      // Breathe
      setBreathe(Math.sin(timeRef.current * paramsRef.current.breatheSpeed ?? 0.6));

      // ── Reorder check ──
      reorderClock.current = Math.max(0, reorderClock.current - 1);
      if (drag.current?.moved && reorderClock.current === 0) {
        const { id } = drag.current;
        const dp = phy.current[id];
        const dw = ws.find(w => w.id === id);
        if (dp && dw) {
          const dragAngle = Math.atan2(dp.y, dp.x);
          let bestOrder = dw.order, bestDist = Infinity;
          Object.entries(targets).forEach(([tid, t]) => {
            if (Number(tid) === id) return;
            const tw = ws.find(w => w.id === Number(tid));
            if (!tw) return;
            let diff = ((t.angle - dragAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            diff = Math.abs(diff);
            if (diff < bestDist) { bestDist = diff; bestOrder = tw.order; }
          });
          const threshold = Math.PI / ws.length * 0.9;
          if (bestOrder !== dw.order && bestDist < threshold) {
            setWidgets(prev => {
              const swapWith = prev.find(w => w.order === bestOrder && w.id !== id);
              return prev.map(w => {
                if (w.id === id) return { ...w, order: bestOrder };
                if (swapWith && w.id === swapWith.id) return { ...w, order: dw.order };
                return w;
              });
            });
            reorderClock.current = 20;
          }
        }
      }

      // ── Integrate ──
      ws.forEach(w => {
        const pp = phy.current[w.id];
        if (!pp) return;

        if (drag.current?.id === w.id) {
          // Dragged: follow mouse exactly
          pp.x = mouseRef.current.x;
          pp.y = mouseRef.current.y;
          pp.vx = 0; pp.vy = 0;
          return;
        }

        const tgt = targets[w.id];
        if (!tgt) return;

        const dx = tgt.x - pp.x;
        const dy = tgt.y - pp.y;
        pp.vx = (pp.vx + dx * p.stiffness * dt) * Math.pow(p.damping, dt);
        pp.vy = (pp.vy + dy * p.stiffness * dt) * Math.pow(p.damping, dt);
        pp.x += pp.vx;
        pp.y += pp.vy;
      });

      // ── Repulsion (prevent overlap) ──
      for (let i = 0; i < ws.length; i++) {
        for (let j = i + 1; j < ws.length; j++) {
          const pi = phy.current[ws[i].id];
          const pj = phy.current[ws[j].id];
          if (!pi || !pj) continue;

          const di = SIZE_DIMS[SIZES[ws[i].sizeIndex]];
          const dj = SIZE_DIMS[SIZES[ws[j].sizeIndex]];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

          // Soft collision radius = sum of half-diagonals + gap
          const ri = Math.sqrt(di.w * di.w + di.h * di.h) / 2;
          const rj = Math.sqrt(dj.w * dj.w + dj.h * dj.h) / 2;
          const minDist = ri + rj + p.gap * 0.5;

          if (dist < minDist) {
            const force = (minDist - dist) / minDist * p.repulsion * dt;
            const nx = dx / dist, ny = dy / dist;
            if (drag.current?.id !== ws[i].id) { pi.vx += nx * force; pi.vy += ny * force; }
            if (drag.current?.id !== ws[j].id) { pj.vx -= nx * force; pj.vy -= ny * force; }
          }
        }
      }

      setTick(t => t + 1);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // ── Breathe params sync ──
  const breatheRef = useRef({ speed: breatheSpeed, scale: breatheScale });
  useEffect(() => { breatheRef.current = { speed: breatheSpeed, scale: breatheScale }; },
    [breatheSpeed, breatheScale]);

  // Patch breathe into RAF via paramsRef
  useEffect(() => { paramsRef.current.breatheSpeed = breatheSpeed; }, [breatheSpeed]);

  // ── Mouse handlers ──────────────────────────────────────────────────────
  const onWidgetMouseDown = useCallback((id, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const p = phy.current[id] ?? { x: 0, y: 0 };
    drag.current = {
      id,
      startX: e.clientX, startY: e.clientY,
      offsetX: p.x, offsetY: p.y,
      moved: false,
    };
    mouseRef.current = { x: p.x, y: p.y };
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      if (Math.hypot(dx, dy) > 5) drag.current.moved = true;
      mouseRef.current = { x: drag.current.offsetX + dx, y: drag.current.offsetY + dy };
    };

    const onUp = () => {
      if (!drag.current) return;
      const { id, moved } = drag.current;
      drag.current = null;

      if (!moved) {
        // Click → cycle size
        setWidgets(prev => {
          const next = prev.map(w =>
            w.id === id ? { ...w, sizeIndex: (w.sizeIndex + 1) % SIZES.length } : w
          );
          // Ripple impulse to all others
          const clicked = prev.find(w => w.id === id);
          next.forEach(w => {
            if (w.id === id) return;
            const p = phy.current[w.id];
            if (!p) return;
            const ang = Math.atan2(p.y, p.x);
            const str = 2.5 + (clicked?.sizeIndex ?? 1) * 0.6;
            p.vx += Math.cos(ang) * str;
            p.vy += Math.sin(ang) * str;
          });
          return next;
        });
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ── Add / Remove ─────────────────────────────────────────────────────────
  const addWidget = useCallback(() => {
    setWidgets(prev => {
      if (prev.length >= 16) return prev;
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const reindexed = sorted.map((w, i) => ({ ...w, order: i }));
      const newW = makeWidget(reindexed.length, 1);
      return [...reindexed, newW];
    });
  }, []);

  const removeWidget = useCallback(() => {
    setWidgets(prev => {
      if (prev.length <= 1) return prev;
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const removed = sorted[sorted.length - 1];
      delete phy.current[removed.id];
      return sorted.slice(0, -1).map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  const { targets, radius } = computeTargets(widgets, gap, orbitPad);

  // Breathing derived values
  const b = breathe;
  const breatheR  = radius * (1 + b * breatheScale * 0.05);
  const centerPulse = 1 + b * breatheScale * 0.5;
  const glowOpacity = 0.035 + b * breatheScale * 0.04;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw", height: "100vh",
        background: "#0c0d0f",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 0; height: 0; }
      `}</style>

      {/* Ambient radial glow — breathes */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse ${55 + b * breatheScale * 8}% ${55 + b * breatheScale * 8}% at 50% 50%, rgba(255,255,255,${glowOpacity}) 0%, transparent 72%)`,
        transition: "none",
      }} />

      {/* Center-relative container */}
      <div style={{ position: "relative", width: 0, height: 0 }}>

        {/* SVG orbit ring */}
        <svg
          style={{
            position: "absolute",
            overflow: "visible",
            width: 0, height: 0,
            pointerEvents: "none",
          }}
        >
          {/* Main orbit ring — dashed, breathing radius */}
          <circle
            cx={0} cy={0} r={breatheR}
            stroke="rgba(255,255,255,0.07)" strokeWidth={0.8}
            fill="none" strokeDasharray="2 8"
          />
          {/* Inner ghost ring */}
          <circle
            cx={0} cy={0} r={breatheR * 0.38}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.6}
            fill="none"
          />
          {/* Outermost whisper ring */}
          <circle
            cx={0} cy={0} r={breatheR * 1.18}
            stroke="rgba(255,255,255,0.02)" strokeWidth={0.5}
            fill="none" strokeDasharray="1 18"
          />
          {/* Slot ticks at widget targets */}
          {Object.values(targets).map((t, i) => {
            const len = 8;
            const nx = Math.cos(t.angle), ny = Math.sin(t.angle);
            return (
              <line key={i}
                x1={nx * (breatheR - len)} y1={ny * (breatheR - len)}
                x2={nx * (breatheR + len)} y2={ny * (breatheR + len)}
                stroke="rgba(255,255,255,0.12)" strokeWidth={0.7}
              />
            );
          })}
        </svg>

        {/* Center node — breathing */}
        <div style={{
          position: "absolute",
          width: 62, height: 62,
          left: -31, top: -31,
          borderRadius: "50%",
          border: `1px solid rgba(255,255,255,${0.1 + b * breatheScale * 0.1})`,
          transform: `scale(${centerPulse})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          transition: "none",
        }}>
          <div style={{
            width: 38, height: 38,
            borderRadius: "50%",
            border: `1px solid rgba(255,255,255,${0.07 + b * breatheScale * 0.07})`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 10, height: 10,
              borderRadius: "50%",
              background: `rgba(255,255,255,${0.75 + b * breatheScale * 0.25})`,
              boxShadow: `0 0 ${14 + b * breatheScale * 16}px rgba(255,255,255,${0.8 + b * breatheScale * 0.2}), 0 0 4px rgba(255,255,255,0.5)`,
            }} />
          </div>
        </div>

        {/* Widgets */}
        {widgets.map(w => {
          const p = phy.current[w.id];
          if (!p) return null;
          const isDragging = drag.current?.id === w.id;
          return (
            <WidgetPanel
              key={w.id}
              w={w}
              px={p.x}
              py={p.y}
              isDragging={isDragging}
              onMouseDown={(e) => onWidgetMouseDown(w.id, e)}
            />
          );
        })}
      </div>

      {/* ── Controls panel ── */}
      <div style={{
        position: "absolute",
        right: 28,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-end",
      }}>
        {/* Toggle */}
        <button
          onClick={() => setShowPanel(v => !v)}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.55)",
            fontSize: 9,
            letterSpacing: "0.16em",
            padding: "7px 12px",
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase",
            backdropFilter: "blur(12px)",
          }}
        >
          {showPanel ? "HIDE" : "CONTROLS"}
        </button>

        {/* Panel */}
        {showPanel && (
          <div style={{
            background: "rgba(14,15,18,0.88)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            width: 220,
            backdropFilter: "blur(24px)",
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
              LAYOUT
            </div>
            <Slider label="Widget Gap"     value={gap}       min={8}    max={80}  step={1}    onChange={setGap}       format={v => `${v}px`} />
            <Slider label="Orbit Padding"  value={orbitPad}  min={0}    max={120} step={1}    onChange={setOrbitPad}  format={v => `${v}px`} />

            <div style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10, marginTop: 4 }}>
              PHYSICS
            </div>
            <Slider label="Spring"     value={stiffness}  min={0.005} max={0.14} step={0.001} onChange={setStiffness} />
            <Slider label="Damping"    value={damping}    min={0.4}   max={0.98} step={0.01}  onChange={setDamping} />
            <Slider label="Repulsion"  value={repulsion}  min={0}     max={12}   step={0.1}   onChange={setRepulsion} />

            <div style={{ fontSize: 8, letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10, marginTop: 4 }}>
              BREATHE
            </div>
            <Slider label="Speed"     value={breatheSpeed} min={0.05} max={4}   step={0.05}  onChange={setBreatheSpeed} />
            <Slider label="Intensity" value={breatheScale}  min={0}    max={0.5} step={0.01}  onChange={setBreatheScale} />
          </div>
        )}
      </div>

      {/* ── Bottom bar: add / remove / count ── */}
      <div style={{
        position: "absolute",
        bottom: 32,
        display: "flex",
        gap: 14,
        alignItems: "center",
      }}>
        <CircleBtn onClick={removeWidget} disabled={widgets.length <= 1}>−</CircleBtn>
        <span style={{
          fontSize: 10, letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.22)",
          minWidth: 80, textAlign: "center",
        }}>
          {widgets.length} {widgets.length === 1 ? "WIDGET" : "WIDGETS"}
        </span>
        <CircleBtn onClick={addWidget} disabled={widgets.length >= 16}>+</CircleBtn>
      </div>

      {/* Hint */}
      <div style={{
        position: "absolute", top: 28,
        fontSize: 9, letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.13)",
        textTransform: "uppercase",
      }}>
        drag · click to resize · controls →
      </div>
    </div>
  );
}

function CircleBtn({ onClick, children, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 38, height: 38,
        borderRadius: "50%",
        border: `1px solid rgba(255,255,255,${hover && !disabled ? 0.32 : 0.12})`,
        background: `rgba(255,255,255,${hover && !disabled ? 0.07 : 0.025})`,
        color: `rgba(255,255,255,${disabled ? 0.14 : hover ? 0.75 : 0.45})`,
        fontSize: 18, lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "monospace",
        transition: "all 0.18s",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </button>
  );
}
