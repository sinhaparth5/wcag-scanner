import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  CSSProperties,
} from 'react';
import { scanBrowserPage, BrowserScanResults, AnnotatedViolation, AnnotatedWarning } from './browserScanner';
import { ScannerOptions } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'violations' | 'warnings';
type ImpactFilter = 'all' | 'critical' | 'serious' | 'moderate' | 'minor';

export interface WcagDevOverlayProps {
  /** WCAG conformance level (default: 'AA') */
  level?: 'A' | 'AA' | 'AAA';
  /** Subset of rules to run. Omit to run all. */
  rules?: string[];
  /** Corner to anchor the overlay (default: 'bottom-right') */
  position?: 'bottom-right' | 'bottom-left';
  /** Delay in ms between DOM mutation and re-scan (default: 750) */
  debounce?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const IMPACT_COLOR: Record<string, string> = {
  critical: '#ef4444',
  serious:  '#f97316',
  moderate: '#eab308',
  minor:    '#3b82f6',
};

const IMPACT_BG: Record<string, string> = {
  critical: '#fef2f2',
  serious:  '#fff7ed',
  moderate: '#fefce8',
  minor:    '#eff6ff',
};

const IMPACT_BORDER: Record<string, string> = {
  critical: '#fca5a5',
  serious:  '#fdba74',
  moderate: '#fde047',
  minor:    '#93c5fd',
};

// ─── Highlight helpers ────────────────────────────────────────────────────────

let _prevHighlighted: Element | null = null;
let _prevOutline = '';
let _prevBoxShadow = '';
let _pinnedEl: Element | null = null;
let _pinnedOutline = '';
let _pinnedBoxShadow = '';

function applyHighlight(el: HTMLElement, color: string) {
  el.style.outline = `3px solid ${color}`;
  el.style.boxShadow = `0 0 0 6px ${color}33`;
}

function highlightElement(el: Element | undefined, pinned = false) {
  if (!el) return;
  const htmlEl = el as HTMLElement;

  if (pinned) {
    // Clear previous pin
    if (_pinnedEl && _pinnedEl !== el) {
      (_pinnedEl as HTMLElement).style.outline = _pinnedOutline;
      (_pinnedEl as HTMLElement).style.boxShadow = _pinnedBoxShadow;
    }
    _pinnedOutline = htmlEl.style.outline;
    _pinnedBoxShadow = htmlEl.style.boxShadow;
    _pinnedEl = el;
    applyHighlight(htmlEl, '#7c3aed');
  } else {
    if (_prevHighlighted) {
      (_prevHighlighted as HTMLElement).style.outline = _prevOutline;
      (_prevHighlighted as HTMLElement).style.boxShadow = _prevBoxShadow;
      _prevHighlighted = null;
    }
    // Don't hover-highlight if this element is pinned
    if (_pinnedEl === el) return;
    _prevOutline = htmlEl.style.outline;
    _prevBoxShadow = htmlEl.style.boxShadow;
    _prevHighlighted = el;
    applyHighlight(htmlEl, '#0ea5e9');
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearHover() {
  if (_prevHighlighted) {
    (_prevHighlighted as HTMLElement).style.outline = _prevOutline;
    (_prevHighlighted as HTMLElement).style.boxShadow = _prevBoxShadow;
    _prevHighlighted = null;
  }
}

function clearPin() {
  if (_pinnedEl) {
    (_pinnedEl as HTMLElement).style.outline = _pinnedOutline;
    (_pinnedEl as HTMLElement).style.boxShadow = _pinnedBoxShadow;
    _pinnedEl = null;
  }
}

function clearAllHighlights() {
  clearHover();
  clearPin();
}

// ─── ViolationCard ─────────────────────────────────────────────────────────────

interface ViolationCardProps {
  item: AnnotatedViolation | AnnotatedWarning;
  index: number;
  pinned: boolean;
  onPin: (el: Element | undefined) => void;
}

const ViolationCard: React.FC<ViolationCardProps> = ({ item, index, pinned, onPin }) => {
  const [expanded, setExpanded] = useState(false);
  const color  = IMPACT_COLOR[item.impact]  ?? '#6b7280';
  const bg     = IMPACT_BG[item.impact]     ?? '#f9fafb';
  const border = IMPACT_BORDER[item.impact] ?? '#d1d5db';

  const cardStyle: CSSProperties = {
    background: bg,
    border: `1px solid ${border}`,
    borderLeft: `4px solid ${color}`,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    transition: 'box-shadow 0.15s',
    boxShadow: pinned ? `0 0 0 2px ${color}` : undefined,
  };

  const headerRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    cursor: item.domElement ? 'pointer' : 'default',
  };

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: color,
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    borderRadius: 4,
    padding: '2px 6px',
    flexShrink: 0,
    marginTop: 2,
  };

  const descStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: '#1e293b',
    lineHeight: 1.45,
    flex: 1,
  };

  const expandBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    color: '#94a3b8',
    padding: '2px 4px',
    flexShrink: 0,
    marginTop: 1,
    lineHeight: 1,
  };

  const detailsStyle: CSSProperties = {
    padding: '0 12px 10px',
    borderTop: `1px solid ${border}`,
  };

  const codeStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    fontSize: 11,
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 6,
    padding: '6px 10px',
    marginTop: 8,
    display: 'block',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
    maxHeight: 80,
    overflow: 'auto',
  };

  const pathStyle: CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#64748b',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '3px 7px',
    marginTop: 6,
    display: 'inline-block',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const metaRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  };

  const wcagTagStyle: CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: '#7c3aed',
    background: '#f5f3ff',
    border: '1px solid #ddd6fe',
    borderRadius: 4,
    padding: '2px 6px',
  };

  const helpStyle: CSSProperties = {
    fontSize: 11,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 1.5,
  };

  const pinIndicatorStyle: CSSProperties = {
    fontSize: 10,
    color: '#7c3aed',
    fontWeight: 700,
    marginLeft: 4,
  };

  return (
    <div style={cardStyle}>
      {/* Header row — hover to highlight, click to pin */}
      <div
        style={headerRowStyle}
        onMouseEnter={() => highlightElement(item.domElement)}
        onMouseLeave={() => clearHover()}
        onClick={() => item.domElement && onPin(item.domElement)}
        title={item.domElement ? (pinned ? 'Click to unpin' : 'Click to pin element') : undefined}
      >
        <span style={badgeStyle}>{item.impact}</span>
        <span style={descStyle}>
          {item.description}
          {pinned && <span style={pinIndicatorStyle}>📍</span>}
        </span>
        <button
          style={expandBtnStyle}
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          title={expanded ? 'Collapse' : 'Expand details'}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={detailsStyle}>
          {item.elementPath && (
            <span style={pathStyle} title="Element path in DOM">
              {item.elementPath}
            </span>
          )}

          {item.snippet && (
            <code style={codeStyle}>{item.snippet}</code>
          )}

          {item.help && (
            <div style={helpStyle}>{item.help}</div>
          )}

          {item.wcag && item.wcag.length > 0 && (
            <div style={metaRowStyle}>
              {item.wcag.map(w => (
                <span key={w} style={wcagTagStyle}>WCAG {w}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Overlay ─────────────────────────────────────────────────────────────

export const WcagDevOverlay: React.FC<WcagDevOverlayProps> = ({
  level = 'AA',
  rules,
  position = 'bottom-right',
  debounce = 750,
}) => {
  const [open, setOpen]             = useState(() => {
    try { return sessionStorage.getItem('wcag-overlay-open') === '1'; } catch { return false; }
  });
  const [tab, setTab]               = useState<Tab>('violations');
  const [filter, setFilter]         = useState<ImpactFilter>('all');
  const [scanning, setScanning]     = useState(false);
  const [results, setResults]       = useState<BrowserScanResults | null>(null);
  const [lastScan, setLastScan]     = useState<Date | null>(null);
  const [pinnedEl, setPinnedEl]     = useState<Element | null>(null);

  // Drag state
  const [pos, setPos]               = useState<{ x: number; y: number } | null>(null);
  const dragging                    = useRef(false);
  const dragOffset                  = useRef({ x: 0, y: 0 });

  const observerRef  = useRef<MutationObserver | null>(null);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRef   = useRef<HTMLDivElement | null>(null);
  const panelRef     = useRef<HTMLDivElement | null>(null);

  // ── Persist open state ──────────────────────────────────────────────────
  useEffect(() => {
    try { sessionStorage.setItem('wcag-overlay-open', open ? '1' : '0'); } catch { /* ignore */ }
    if (!open) clearAllHighlights();
  }, [open]);

  // ── Scan ────────────────────────────────────────────────────────────────
  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const opts: ScannerOptions = { level, rules };
      const res = await scanBrowserPage(opts);
      setResults(res);
      setLastScan(new Date());
    } finally {
      setScanning(false);
    }
  }, [level, rules]);

  useEffect(() => { scan(); }, [scan]);

  // ── MutationObserver ────────────────────────────────────────────────────
  useEffect(() => {
    observerRef.current = new MutationObserver((mutations) => {
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
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'role', 'alt', 'src', 'href'],
    });

    return () => {
      observerRef.current?.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
      clearAllHighlights();
    };
  }, [scan, debounce]);

  // ── Keyboard shortcut Alt+Shift+W ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'W') {
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Pin handler ─────────────────────────────────────────────────────────
  const handlePin = useCallback((el: Element | undefined) => {
    if (!el) return;
    if (_pinnedEl === el) {
      clearPin();
      setPinnedEl(null);
    } else {
      highlightElement(el, true);
      setPinnedEl(el);
    }
  }, []);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true;
    const rect = overlayRef.current?.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
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
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────
  const violationCount = results?.violations.length ?? 0;
  const warningCount   = results?.warnings.length   ?? 0;
  const isLeft = position === 'bottom-left';

  const rawItems = tab === 'violations' ? results?.violations : results?.warnings;
  const items = filter === 'all'
    ? rawItems
    : rawItems?.filter(i => i.impact === filter);
  const isEmpty = !items || items.length === 0;

  const elapsed = lastScan
    ? (() => {
        const s = Math.round((Date.now() - lastScan.getTime()) / 1000);
        return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
      })()
    : '—';

  // ── Styles ───────────────────────────────────────────────────────────────

  const anchorStyle: CSSProperties = pos
    ? { position: 'fixed', top: pos.y, left: pos.x, zIndex: 2147483647, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
    : {
        position: 'fixed',
        bottom: 20,
        [isLeft ? 'left' : 'right']: 20,
        zIndex: 2147483647,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      };

  const toggleStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: violationCount > 0 ? '#7c3aed' : scanning ? '#475569' : '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 24,
    padding: '9px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
    transition: 'transform 0.1s, box-shadow 0.1s',
    userSelect: 'none',
  };

  const badgeCountStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    padding: '1px 7px',
    fontSize: 12,
    fontWeight: 700,
  };

  const panelStyle: CSSProperties = {
    position: 'absolute',
    bottom: pos ? undefined : 54,
    top: pos ? 54 : undefined,
    [isLeft ? 'left' : 'right']: 0,
    width: 420,
    maxHeight: '75vh',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 24px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '11px 14px',
    background: '#0f172a',
    gap: 8,
    cursor: 'grab',
    userSelect: 'none',
  };

  const summaryStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: '10px 14px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
  };

  const toolbarStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 14px',
    gap: 4,
  };

  const tabBtnStyle = (active: boolean): CSSProperties => ({
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? '#7c3aed' : '#64748b',
    borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottomColor: active ? '#7c3aed' : 'transparent',
    borderBottomStyle: 'solid',
    borderBottomWidth: 2,
    whiteSpace: 'nowrap',
  });

  const filterSelectStyle: CSSProperties = {
    marginLeft: 'auto',
    fontSize: 11,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '3px 8px',
    color: '#475569',
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
  };

  const listStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 12px',
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 11,
    color: '#94a3b8',
  };

  const rescanBtnStyle: CSSProperties = {
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 600,
    cursor: scanning ? 'wait' : 'pointer',
    opacity: scanning ? 0.6 : 1,
  };

  const chipStyle = (color: string, active = true): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: active ? color : '#94a3b8',
    background: active ? `${color}18` : '#f1f5f9',
    border: `1px solid ${active ? color + '40' : '#e2e8f0'}`,
    borderRadius: 6,
    padding: '4px 10px',
    flexShrink: 0,
  });

  const iconBtnStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '3px 6px',
    fontSize: 14,
    lineHeight: 1,
    borderRadius: 4,
    transition: 'color 0.15s',
  };

  return (
    <div ref={overlayRef} style={anchorStyle} data-wcag-overlay="true">
      {/* Panel */}
      {open && (
        <div ref={panelRef} style={panelStyle} role="dialog" aria-label="WCAG Dev Inspector">
          {/* Header (drag handle) */}
          <div style={headerStyle} onMouseDown={onDragStart}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>♿</span>
            <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: '#f1f5f9', letterSpacing: '0.01em' }}>
              WCAG Dev Inspector
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#a78bfa',
              background: '#4c1d95', borderRadius: 4, padding: '2px 7px', letterSpacing: '0.05em',
            }}>
              {level}
            </span>
            <button
              onClick={scan}
              disabled={scanning}
              title="Rescan page"
              style={{ ...iconBtnStyle, color: scanning ? '#475569' : '#94a3b8', fontSize: 16 }}
            >
              {scanning ? '⏳' : '↻'}
            </button>
            <button
              onClick={() => setOpen(false)}
              title="Close (Alt+Shift+W)"
              style={{ ...iconBtnStyle, fontSize: 15 }}
            >
              ✕
            </button>
          </div>

          {/* Summary chips */}
          <div style={summaryStyle}>
            <span style={chipStyle('#ef4444', violationCount > 0)}>
              ✗ {violationCount} violation{violationCount !== 1 ? 's' : ''}
            </span>
            <span style={chipStyle('#f97316', warningCount > 0)}>
              ⚠ {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
            <span style={chipStyle('#16a34a', (results?.passes.length ?? 0) > 0)}>
              ✓ {results?.passes.length ?? 0} pass{(results?.passes.length ?? 0) !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Tabs + filter */}
          <div style={toolbarStyle}>
            {(['violations', 'warnings'] as Tab[]).map(t => (
              <button key={t} style={tabBtnStyle(tab === t)} onClick={() => setTab(t)}>
                {t === 'violations'
                  ? `Violations (${violationCount})`
                  : `Warnings (${warningCount})`}
              </button>
            ))}
            <select
              style={filterSelectStyle}
              value={filter}
              onChange={e => setFilter(e.target.value as ImpactFilter)}
              title="Filter by impact"
            >
              <option value="all">All impacts</option>
              <option value="critical">Critical</option>
              <option value="serious">Serious</option>
              <option value="moderate">Moderate</option>
              <option value="minor">Minor</option>
            </select>
          </div>

          {/* List */}
          <div style={listStyle}>
            {scanning && !results && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
                Scanning…
              </div>
            )}
            {!scanning && isEmpty && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>
                  {tab === 'violations' ? '✅' : '🔕'}
                </div>
                <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                  No {tab} found
                </div>
                {filter !== 'all' && (
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 6 }}>
                    (filter: {filter} — <button
                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: 11, padding: 0 }}
                      onClick={() => setFilter('all')}
                    >clear</button>)
                  </div>
                )}
              </div>
            )}
            {items?.map((item, i) => (
              <ViolationCard
                key={`${item.rule}-${i}`}
                item={item}
                index={i}
                pinned={pinnedEl === item.domElement && item.domElement != null}
                onPin={handlePin}
              />
            ))}
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <span>
              {pinnedEl ? '📍 element pinned · ' : ''}
              Scanned {elapsed}
              {results && ` · ${results.duration}ms`}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {pinnedEl && (
                <button
                  style={{ ...rescanBtnStyle, background: '#64748b' }}
                  onClick={() => { clearPin(); setPinnedEl(null); }}
                >
                  Unpin
                </button>
              )}
              <button style={rescanBtnStyle} onClick={scan} disabled={scanning}>
                {scanning ? 'Scanning…' : 'Rescan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        style={toggleStyle}
        onClick={() => setOpen(o => !o)}
        title="Toggle WCAG Dev Inspector (Alt+Shift+W)"
        aria-expanded={open}
        aria-label={`WCAG Inspector: ${violationCount} violation${violationCount !== 1 ? 's' : ''}`}
      >
        <span style={{ fontSize: 16 }}>♿</span>
        {scanning
          ? <span style={{ opacity: 0.8, fontSize: 12 }}>scanning…</span>
          : violationCount > 0
          ? <><span style={badgeCountStyle}>{violationCount}</span> <span style={{ fontSize: 12 }}>issues</span></>
          : <span style={badgeCountStyle}>✓</span>
        }
      </button>
    </div>
  );
};

export default WcagDevOverlay;
