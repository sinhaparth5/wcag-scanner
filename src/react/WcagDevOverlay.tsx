import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  CSSProperties,
} from 'react';
import { scanBrowserPage, BrowserScanResults, AnnotatedViolation, AnnotatedWarning } from './browserScanner';
import { ScannerOptions } from '../types';

type Tab = 'violations' | 'warnings';
type ImpactFilter = 'all' | 'critical' | 'serious' | 'moderate' | 'minor';

export interface WcagDevOverlayProps {
  level?: 'A' | 'AA' | 'AAA';
  rules?: string[];
  position?: 'bottom-right' | 'bottom-left';
  debounce?: number;
}

// ─── Impact theme ──────────────────────────────────────────────────────────────

const IMPACT: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  serious:  { color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  moderate: { color: '#ca8a04', bg: '#fefce8', border: '#fde047' },
  minor:    { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
};
const impactTheme = (impact: string) => IMPACT[impact] ?? { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };

// ─── Highlight helpers ─────────────────────────────────────────────────────────

let _hovered: { el: HTMLElement; outline: string; shadow: string } | null = null;
let _pinned:  { el: HTMLElement; outline: string; shadow: string } | null = null;

function restoreEl(saved: { el: HTMLElement; outline: string; shadow: string }) {
  saved.el.style.outline   = saved.outline;
  saved.el.style.boxShadow = saved.shadow;
}

function applyHighlight(el: HTMLElement, color: string) {
  el.style.outline   = `2px solid ${color}`;
  el.style.boxShadow = `0 0 0 4px ${color}28`;
}

function hoverEl(el: Element | undefined) {
  if (_hovered) { restoreEl(_hovered); _hovered = null; }
  if (!el || _pinned?.el === el) return;
  const h = el as HTMLElement;
  _hovered = { el: h, outline: h.style.outline, shadow: h.style.boxShadow };
  applyHighlight(h, '#0ea5e9');
  h.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearHover() {
  if (_hovered) { restoreEl(_hovered); _hovered = null; }
}

function pinEl(el: Element): boolean {
  if (_pinned?.el === el) {
    restoreEl(_pinned); _pinned = null; return false;
  }
  if (_pinned) restoreEl(_pinned);
  if (_hovered?.el === el) { restoreEl(_hovered); _hovered = null; }
  const h = el as HTMLElement;
  _pinned = { el: h, outline: h.style.outline, shadow: h.style.boxShadow };
  applyHighlight(h, '#7c3aed');
  h.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return true;
}

function clearAllHighlights() {
  if (_hovered) { restoreEl(_hovered); _hovered = null; }
  if (_pinned)  { restoreEl(_pinned);  _pinned  = null; }
}

// ─── ViolationCard ─────────────────────────────────────────────────────────────

interface CardProps {
  item: AnnotatedViolation | AnnotatedWarning;
  pinned: boolean;
  onPin: (el: Element) => void;
}

const ViolationCard: React.FC<CardProps> = ({ item, pinned, onPin }) => {
  const [expanded, setExpanded] = useState(false);
  const { color, bg, border } = impactTheme(item.impact);
  const clickable = !!item.domElement;

  return (
    <div style={{
      background: bg,
      borderRadius: 8,
      marginBottom: 6,
      overflow: 'hidden',
      outline: pinned ? `2px solid ${color}` : `1px solid ${border}`,
      outlineOffset: pinned ? 1 : 0,
      borderLeft: `3px solid ${color}`,
    }}>
      {/* Main row */}
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px', cursor: clickable ? 'pointer' : 'default' }}
        onMouseEnter={() => hoverEl(item.domElement)}
        onMouseLeave={() => clearHover()}
        onClick={() => item.domElement && onPin(item.domElement)}
      >
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          background: color, color: '#fff', borderRadius: 4, padding: '2px 5px', flexShrink: 0, marginTop: 2,
        }}>
          {item.impact}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#1e293b', lineHeight: 1.5, flex: 1 }}>
          {item.description}
          {pinned && <span style={{ marginLeft: 5, fontSize: 10 }}>📍</span>}
        </span>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 11, padding: '1px 4px', flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          title={expanded ? 'Collapse' : 'Show details'}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Details */}
      {expanded && (
        <div style={{ padding: '0 10px 10px', borderTop: `1px solid ${border}` }}>
          {item.elementPath && (
            <code style={{
              display: 'block', marginTop: 8, fontSize: 10, color: '#475569',
              background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4,
              padding: '3px 7px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.elementPath}
            </code>
          )}
          {item.snippet && (
            <code style={{
              display: 'block', marginTop: 6, fontSize: 10,
              background: '#0f172a', color: '#e2e8f0', borderRadius: 5,
              padding: '5px 8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: 72, overflow: 'auto',
            }}>
              {item.snippet}
            </code>
          )}
          {item.help && (
            <p style={{ margin: '7px 0 0', fontSize: 11, color: '#475569', fontStyle: 'italic', lineHeight: 1.5 }}>
              {item.help}
            </p>
          )}
          {item.wcag && item.wcag.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
              {item.wcag.map(w => (
                <span key={w} style={{
                  fontSize: 10, fontWeight: 600, color: '#7c3aed',
                  background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 4, padding: '1px 6px',
                }}>
                  WCAG {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Overlay ──────────────────────────────────────────────────────────────

export const WcagDevOverlay: React.FC<WcagDevOverlayProps> = ({
  level = 'AA',
  rules,
  position = 'bottom-right',
  debounce = 750,
}) => {
  const [open, setOpen]         = useState(() => {
    try { return sessionStorage.getItem('wcag-open') === '1'; } catch { return false; }
  });
  const [tab, setTab]           = useState<Tab>('violations');
  const [filter, setFilter]     = useState<ImpactFilter>('all');
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState<BrowserScanResults | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [pinnedEl, setPinnedEl] = useState<Element | null>(null);

  // Drag
  const [pos, setPos]           = useState<{ x: number; y: number } | null>(null);
  const dragging                = useRef(false);
  const dragOffset              = useRef({ x: 0, y: 0 });

  const observerRef  = useRef<MutationObserver | null>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef   = useRef<HTMLDivElement | null>(null);
  const scanningRef  = useRef(false);
  const cooldownRef  = useRef(false);

  // ── Persist open state ────────────────────────────────────────────────────
  useEffect(() => {
    try { sessionStorage.setItem('wcag-open', open ? '1' : '0'); } catch { /* */ }
    if (!open) clearAllHighlights();
  }, [open]);

  // ── Scan ──────────────────────────────────────────────────────────────────
  const scan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    try {
      const res = await scanBrowserPage({ level, rules });
      setResults(res);
      setLastScan(new Date());
    } finally {
      // Set cooldown BEFORE clearing scanningRef so the observer gap is covered
      cooldownRef.current = true;
      scanningRef.current = false;
      setScanning(false);
      setTimeout(() => { cooldownRef.current = false; }, 1200);
    }
  }, [level, rules]);

  useEffect(() => { scan(); }, [scan]);

  // ── MutationObserver ──────────────────────────────────────────────────────
  useEffect(() => {
    observerRef.current = new MutationObserver((mutations) => {
      if (scanningRef.current || cooldownRef.current) return;
      if (
        overlayRef.current &&
        mutations.every(m => overlayRef.current!.contains(m.target as Node))
      ) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(scan, debounce);
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      // 'style' excluded — our highlight helper modifies inline styles on
      // page elements which would otherwise cause an infinite rescan loop
      attributeFilter: ['class', 'hidden', 'aria-hidden', 'role', 'alt', 'src', 'href'],
    });

    return () => {
      observerRef.current?.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
      clearAllHighlights();
    };
  }, [scan, debounce]);

  // ── Keyboard shortcut Alt+Shift+W ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'W') setOpen(o => !o);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Pin handler ───────────────────────────────────────────────────────────
  const handlePin = useCallback((el: Element) => {
    const nowPinned = pinEl(el);
    setPinnedEl(nowPinned ? el : null);
  }, []);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true;
    const rect = overlayRef.current?.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const vCount = results?.violations.length ?? 0;
  const wCount = results?.warnings.length   ?? 0;
  const pCount = results?.passes.length     ?? 0;
  const isLeft = position === 'bottom-left';

  const rawItems  = tab === 'violations' ? results?.violations : results?.warnings;
  const items     = filter === 'all' ? rawItems : rawItems?.filter(i => i.impact === filter);
  const isEmpty   = !items || items.length === 0;

  const elapsed = lastScan ? (() => {
    const s = Math.round((Date.now() - lastScan.getTime()) / 1000);
    return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
  })() : '—';

  // ── Styles ────────────────────────────────────────────────────────────────

  const anchorStyle: CSSProperties = pos
    ? { position: 'fixed', top: pos.y, left: pos.x, zIndex: 2147483647, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
    : { position: 'fixed', bottom: 20, [isLeft ? 'left' : 'right']: 20, zIndex: 2147483647, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' };

  const btnColor = scanning ? '#64748b' : vCount > 0 ? '#7c3aed' : '#16a34a';

  const s = {
    toggle: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: btnColor, color: '#fff', border: 'none', borderRadius: 22,
      padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)', userSelect: 'none',
    } as CSSProperties,

    badge: {
      background: 'rgba(255,255,255,0.22)', borderRadius: 9,
      padding: '1px 6px', fontSize: 11, fontWeight: 700,
    } as CSSProperties,

    panel: {
      position: 'absolute',
      bottom: pos ? undefined : 48,
      top: pos ? 48 : undefined,
      [isLeft ? 'left' : 'right']: 0,
      width: 400,
      maxHeight: '74vh',
      background: '#ffffff',
      borderRadius: 10,
      boxShadow: '0 8px 40px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.07)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    } as CSSProperties,

    header: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', background: '#0f172a',
      cursor: 'grab', userSelect: 'none', flexShrink: 0,
    } as CSSProperties,

    headerBtn: {
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#64748b', fontSize: 14, padding: '2px 5px', lineHeight: 1, borderRadius: 4,
    } as CSSProperties,

    summary: {
      display: 'flex', gap: 6, padding: '8px 12px',
      borderBottom: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0,
    } as CSSProperties,

    toolbar: {
      display: 'flex', alignItems: 'center',
      borderBottom: '1px solid #f1f5f9', padding: '0 12px',
      gap: 2, flexShrink: 0,
    } as CSSProperties,

    list: {
      flex: 1, overflowY: 'auto', padding: '10px 10px',
    } as CSSProperties,

    footer: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 12px', borderTop: '1px solid #f1f5f9',
      background: '#f8fafc', fontSize: 10, color: '#94a3b8', flexShrink: 0,
    } as CSSProperties,
  };

  const chip = (color: string, count: number): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600,
    color: count > 0 ? color : '#94a3b8',
    background: count > 0 ? `${color}14` : '#f1f5f9',
    border: `1px solid ${count > 0 ? color + '35' : '#e2e8f0'}`,
    borderRadius: 5, padding: '3px 8px', flexShrink: 0,
  });

  const tabBtn = (active: boolean): CSSProperties => ({
    padding: '7px 10px', fontSize: 12, fontWeight: active ? 600 : 400,
    color: active ? '#7c3aed' : '#64748b', cursor: 'pointer',
    background: 'none', border: 'none',
    boxShadow: active ? 'inset 0 -2px 0 #7c3aed' : 'none',
    whiteSpace: 'nowrap',
  });

  const rescanBtn: CSSProperties = {
    background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 5,
    padding: '4px 10px', fontSize: 10, fontWeight: 600,
    cursor: scanning ? 'wait' : 'pointer', opacity: scanning ? 0.55 : 1,
  };

  return (
    <div ref={overlayRef} style={anchorStyle} data-wcag-overlay="true">
      {open && (
        <div style={s.panel} role="dialog" aria-label="WCAG Dev Inspector">
          {/* Header */}
          <div style={s.header} onMouseDown={onDragStart}>
            <span style={{ fontSize: 14 }}>♿</span>
            <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: '#f1f5f9' }}>WCAG Inspector</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#a78bfa',
              background: '#4c1d95', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em',
            }}>
              {level}
            </span>
            <button onClick={scan} disabled={scanning} title="Rescan" style={s.headerBtn}>
              {scanning ? '⏳' : '↻'}
            </button>
            <button onClick={() => setOpen(false)} title="Close (Alt+Shift+W)" style={s.headerBtn}>✕</button>
          </div>

          {/* Summary */}
          <div style={s.summary}>
            <span style={chip('#dc2626', vCount)}>✗ {vCount} violation{vCount !== 1 ? 's' : ''}</span>
            <span style={chip('#ea580c', wCount)}>⚠ {wCount} warning{wCount !== 1 ? 's' : ''}</span>
            <span style={chip('#16a34a', pCount)}>✓ {pCount} pass{pCount !== 1 ? 'es' : ''}</span>
          </div>

          {/* Tabs + filter */}
          <div style={s.toolbar}>
            <button style={tabBtn(tab === 'violations')} onClick={() => setTab('violations')}>
              Violations ({vCount})
            </button>
            <button style={tabBtn(tab === 'warnings')} onClick={() => setTab('warnings')}>
              Warnings ({wCount})
            </button>
            <select
              style={{
                marginLeft: 'auto', fontSize: 10, border: '1px solid #e2e8f0',
                borderRadius: 5, padding: '3px 6px', color: '#475569', background: '#fff', cursor: 'pointer', outline: 'none',
              }}
              value={filter}
              onChange={e => setFilter(e.target.value as ImpactFilter)}
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="serious">Serious</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
            </select>
          </div>

          {/* List */}
          <div style={s.list}>
            {scanning && !results && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '28px 0', fontSize: 12 }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>⏳</div>Scanning…
              </div>
            )}
            {!scanning && isEmpty && (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{tab === 'violations' ? '✅' : '🔕'}</div>
                <div style={{ color: '#64748b', fontSize: 12, fontWeight: 500 }}>No {tab} found</div>
                {filter !== 'all' && (
                  <button
                    style={{ marginTop: 6, fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setFilter('all')}
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
            {items?.map((item, i) => (
              <ViolationCard
                key={`${item.rule}-${i}`}
                item={item}
                pinned={pinnedEl === item.domElement && item.domElement != null}
                onPin={handlePin}
              />
            ))}
          </div>

          {/* Footer */}
          <div style={s.footer}>
            <span>{pinnedEl ? '📍 pinned · ' : ''}Scanned {elapsed}{results ? ` · ${results.duration}ms` : ''}</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {pinnedEl && (
                <button style={{ ...rescanBtn, background: '#64748b' }} onClick={() => { clearAllHighlights(); setPinnedEl(null); }}>
                  Unpin
                </button>
              )}
              <button style={rescanBtn} onClick={scan} disabled={scanning}>
                {scanning ? 'Scanning…' : 'Rescan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        style={s.toggle}
        onClick={() => setOpen(o => !o)}
        title="Toggle WCAG Inspector (Alt+Shift+W)"
        aria-expanded={open}
      >
        <span style={{ fontSize: 14 }}>♿</span>
        {scanning
          ? <span style={{ opacity: 0.8, fontSize: 11 }}>scanning…</span>
          : vCount > 0
            ? <><span style={s.badge}>{vCount}</span><span style={{ fontSize: 11 }}>issues</span></>
            : <span style={s.badge}>✓</span>
        }
      </button>
    </div>
  );
};

export default WcagDevOverlay;
