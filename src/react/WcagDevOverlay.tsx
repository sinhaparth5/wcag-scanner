import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  CSSProperties,
} from 'react';
import { scanBrowserPage, BrowserScanResults, AnnotatedViolation, AnnotatedWarning } from './browserScanner';
import { getAiSuggestion, getStoredApiKey, setStoredApiKey, AiSuggestion } from './gemini';
import { ScannerOptions } from '../types';

type Tab    = 'violations' | 'warnings';
type View   = 'list' | 'settings';
type Impact = 'all' | 'critical' | 'serious' | 'moderate' | 'minor';

export interface WcagDevOverlayProps {
  level?:    'A' | 'AA' | 'AAA';
  rules?:    string[];
  position?: 'bottom-right' | 'bottom-left';
  debounce?: number;
}

// ─── Impact colours ───────────────────────────────────────────────────────────
const IMPACT: Record<string, { color: string; bg: string; border: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  serious:  { color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  moderate: { color: '#ca8a04', bg: '#fefce8', border: '#fde047' },
  minor:    { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
};
const theme = (impact: string) => IMPACT[impact] ?? { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };

// ─── Highlight helpers ─────────────────────────────────────────────────────────
// No scrollIntoView on hover — only on pin — to eliminate lag
let _hovered: { el: HTMLElement; outline: string; shadow: string } | null = null;
let _pinned:  { el: HTMLElement; outline: string; shadow: string } | null = null;
let _hoverRaf = 0;

function restoreEl(saved: { el: HTMLElement; outline: string; shadow: string }) {
  saved.el.style.outline   = saved.outline;
  saved.el.style.boxShadow = saved.shadow;
}

function applyOutline(el: HTMLElement, color: string) {
  el.style.outline   = `2px solid ${color}`;
  el.style.boxShadow = `0 0 0 4px ${color}28`;
}

function hoverEl(el: Element | undefined) {
  cancelAnimationFrame(_hoverRaf);
  _hoverRaf = requestAnimationFrame(() => {
    if (_hovered) { restoreEl(_hovered); _hovered = null; }
    if (!el || _pinned?.el === el) return;
    const h = el as HTMLElement;
    _hovered = { el: h, outline: h.style.outline, shadow: h.style.boxShadow };
    applyOutline(h, '#0ea5e9');
  });
}

function clearHover() {
  cancelAnimationFrame(_hoverRaf);
  _hoverRaf = requestAnimationFrame(() => {
    if (_hovered) { restoreEl(_hovered); _hovered = null; }
  });
}

/** Returns true if now pinned, false if unpinned */
function togglePin(el: Element): boolean {
  if (_hovered?.el === el) { restoreEl(_hovered); _hovered = null; }
  if (_pinned?.el === el) { restoreEl(_pinned); _pinned = null; return false; }
  if (_pinned) restoreEl(_pinned);
  const h = el as HTMLElement;
  _pinned = { el: h, outline: h.style.outline, shadow: h.style.boxShadow };
  applyOutline(h, '#7c3aed');
  h.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return true;
}

function clearAllHighlights() {
  cancelAnimationFrame(_hoverRaf);
  if (_hovered) { restoreEl(_hovered); _hovered = null; }
  if (_pinned)  { restoreEl(_pinned);  _pinned  = null; }
}

// ─── ViolationCard ─────────────────────────────────────────────────────────────
interface CardProps {
  item: AnnotatedViolation | AnnotatedWarning;
  pinned: boolean;
  onPin: (el: Element) => void;
  apiKey: string;
}

const ViolationCard: React.FC<CardProps> = ({ item, pinned, onPin, apiKey }) => {
  const [expanded, setExpanded]   = useState(false);
  const [aiState, setAiState]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [aiError, setAiError]     = useState('');
  const { color, bg, border }     = theme(item.impact);

  const fetchAi = async () => {
    if (!apiKey || aiState === 'loading') return;
    setAiState('loading');
    setAiError('');
    try {
      const s = await getAiSuggestion(apiKey, item);
      setSuggestion(s);
      setAiState('done');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Unknown error');
      setAiState('error');
    }
  };

  return (
    <div style={{
      background: bg, borderRadius: 8, marginBottom: 6, overflow: 'hidden',
      outline: pinned ? `2px solid ${color}` : `1px solid ${border}`,
      outlineOffset: pinned ? 1 : 0,
      borderLeft: `3px solid ${color}`,
    }}>
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px', cursor: item.domElement ? 'pointer' : 'default' }}
        onMouseEnter={() => hoverEl(item.domElement)}
        onMouseLeave={() => clearHover()}
        onClick={() => item.domElement && onPin(item.domElement)}
        title={item.domElement ? (pinned ? 'Click to unpin' : 'Click to pin element') : undefined}
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
              padding: '3px 7px', fontFamily: 'monospace', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }} title={item.elementSelector}>
              {item.elementPath}
            </code>
          )}

          {item.snippet && (
            <code style={{
              display: 'block', marginTop: 6, fontSize: 10,
              background: '#0f172a', color: '#e2e8f0', borderRadius: 5,
              padding: '5px 8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap',
              wordBreak: 'break-all', maxHeight: 72, overflow: 'auto',
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

          {/* AI suggestion */}
          {apiKey && (
            <div style={{ marginTop: 10, borderTop: `1px solid ${border}`, paddingTop: 8 }}>
              {aiState === 'idle' && (
                <button
                  onClick={fetchAi}
                  style={{
                    fontSize: 10, fontWeight: 600, color: '#7c3aed',
                    background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 5,
                    padding: '3px 9px', cursor: 'pointer',
                  }}
                >
                  ✨ Get AI fix
                </button>
              )}
              {aiState === 'loading' && (
                <span style={{ fontSize: 10, color: '#94a3b8' }}>⏳ Asking Gemini…</span>
              )}
              {aiState === 'error' && (
                <div>
                  <span style={{ fontSize: 10, color: '#dc2626' }}>⚠ {aiError}</span>
                  <button onClick={fetchAi} style={{ marginLeft: 8, fontSize: 10, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Retry
                  </button>
                </div>
              )}
              {aiState === 'done' && suggestion && (
                <div>
                  {suggestion.code && (
                    <code style={{
                      display: 'block', fontSize: 10, background: '#0f172a', color: '#86efac',
                      borderRadius: 5, padding: '5px 8px', fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 100, overflow: 'auto',
                    }}>
                      {suggestion.code}
                    </code>
                  )}
                  {suggestion.explanation && (
                    <p style={{ margin: '5px 0 0', fontSize: 11, color: '#16a34a', fontStyle: 'italic' }}>
                      {suggestion.explanation}
                    </p>
                  )}
                  <button onClick={() => { setSuggestion(null); setAiState('idle'); }}
                    style={{ marginTop: 4, fontSize: 10, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Settings Panel ────────────────────────────────────────────────────────────
interface SettingsProps {
  apiKey: string;
  onSave: (key: string) => void;
}

const SettingsPanel: React.FC<SettingsProps> = ({ apiKey, onSave }) => {
  const [draft, setDraft] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setStoredApiKey(draft);
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: '16px 14px', flex: 1, overflowY: 'auto' }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
        Enter your <strong>Google Gemini API key</strong> to get AI-powered fix suggestions for each violation.
        The key is stored in <code style={{ fontSize: 11, background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>localStorage</code> and never leaves your browser.
      </p>

      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        Gemini API Key
      </label>
      <input
        type="password"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="AIza…"
        style={{
          width: '100%', boxSizing: 'border-box', fontSize: 12,
          border: '1px solid #d1d5db', borderRadius: 6, padding: '7px 10px',
          outline: 'none', fontFamily: 'monospace',
          background: '#f9fafb',
        }}
        onKeyDown={e => { if (e.key === 'Enter') save(); }}
      />

      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={save}
          style={{
            background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6,
            padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {saved ? '✓ Saved' : 'Save key'}
        </button>
        {draft && (
          <button
            onClick={() => { setDraft(''); setStoredApiKey(''); onSave(''); }}
            style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      <p style={{ marginTop: 16, fontSize: 10, color: '#9ca3af', lineHeight: 1.6 }}>
        Get a free key at{' '}
        <span style={{ color: '#7c3aed', fontWeight: 600 }}>aistudio.google.com</span>
        {' '}→ Get API key. The free tier is sufficient for development use.
      </p>
    </div>
  );
};

// ─── Main Overlay ──────────────────────────────────────────────────────────────
export const WcagDevOverlay: React.FC<WcagDevOverlayProps> = ({
  level = 'AA', rules, position = 'bottom-right', debounce = 750,
}) => {
  const [open, setOpen]         = useState(() => { try { return sessionStorage.getItem('wcag-open') === '1'; } catch { return false; } });
  const [view, setView]         = useState<View>('list');
  const [tab, setTab]           = useState<Tab>('violations');
  const [filter, setFilter]     = useState<Impact>('all');
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState<BrowserScanResults | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [pinnedEl, setPinnedEl] = useState<Element | null>(null);
  const [apiKey, setApiKey]     = useState<string>(() => getStoredApiKey());

  // Drag
  const [pos, setPos]     = useState<{ x: number; y: number } | null>(null);
  const dragging          = useRef(false);
  const dragOffset        = useRef({ x: 0, y: 0 });

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
    // Set cooldown BEFORE clearing scanningRef to close the observer gap
    cooldownRef.current = true;
    scanningRef.current = true;
    setScanning(true);
    try {
      const res = await scanBrowserPage({ level, rules } as ScannerOptions);
      setResults(res);
      setLastScan(new Date());
    } finally {
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
      if (overlayRef.current && mutations.every(m => overlayRef.current!.contains(m.target as Node))) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(scan, debounce);
    });

    observerRef.current.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'hidden', 'aria-hidden', 'role', 'alt', 'src', 'href'],
    });

    return () => {
      observerRef.current?.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
      clearAllHighlights();
    };
  }, [scan, debounce]);

  // ── Keyboard Alt+Shift+W ──────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.altKey && e.shiftKey && e.key === 'W') setOpen(o => !o); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Pin ───────────────────────────────────────────────────────────────────
  const handlePin = useCallback((el: Element) => {
    const nowPinned = togglePin(el);
    setPinnedEl(nowPinned ? el : null);
  }, []);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onDragStart = (e: React.MouseEvent) => {
    dragging.current = true;
    const r = overlayRef.current?.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
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

  const rawItems = tab === 'violations' ? results?.violations : results?.warnings;
  const items    = filter === 'all' ? rawItems : rawItems?.filter(i => i.impact === filter);
  const isEmpty  = !items || items.length === 0;

  const elapsed = lastScan ? (() => {
    const s = Math.round((Date.now() - lastScan.getTime()) / 1000);
    return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
  })() : '—';

  // ── Styles ────────────────────────────────────────────────────────────────
  const anchorStyle: CSSProperties = pos
    ? { position: 'fixed', top: pos.y, left: pos.x, zIndex: 2147483647, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
    : { position: 'fixed', bottom: 20, [isLeft ? 'left' : 'right']: 20, zIndex: 2147483647, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' };

  const btnBg = scanning ? '#64748b' : vCount > 0 ? '#7c3aed' : '#16a34a';

  const iconBtnStyle: CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#64748b', fontSize: 14, padding: '2px 5px', lineHeight: 1, borderRadius: 4,
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

  const viewActive = (v: View): CSSProperties => ({
    ...iconBtnStyle,
    color: view === v ? '#7c3aed' : '#64748b',
    background: view === v ? '#f5f3ff' : 'none',
  });

  return (
    <div ref={overlayRef} style={anchorStyle} data-wcag-overlay="true">
      {open && (
        <div style={{
          position: 'absolute', bottom: pos ? undefined : 48, top: pos ? 48 : undefined,
          [isLeft ? 'left' : 'right']: 0, width: 410, maxHeight: '75vh',
          background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }} role="dialog" aria-label="WCAG Dev Inspector">

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: '#0f172a',
            cursor: 'grab', userSelect: 'none', flexShrink: 0,
          }} onMouseDown={onDragStart}>
            <span style={{ fontSize: 14 }}>♿</span>
            <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: '#f1f5f9' }}>WCAG Inspector</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#a78bfa',
              background: '#4c1d95', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em',
            }}>
              {level}
            </span>
            {/* Settings toggle */}
            <button onClick={() => setView(v => v === 'settings' ? 'list' : 'settings')} style={viewActive('settings')} title="Settings">
              ⚙
            </button>
            <button onClick={scan} disabled={scanning} title="Rescan" style={iconBtnStyle}>
              {scanning ? '⏳' : '↻'}
            </button>
            <button onClick={() => setOpen(false)} title="Close (Alt+Shift+W)" style={iconBtnStyle}>✕</button>
          </div>

          {view === 'settings' ? (
            <SettingsPanel apiKey={apiKey} onSave={k => setApiKey(k)} />
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
                <span style={chip('#dc2626', vCount)}>✗ {vCount} violation{vCount !== 1 ? 's' : ''}</span>
                <span style={chip('#ea580c', wCount)}>⚠ {wCount} warning{wCount !== 1 ? 's' : ''}</span>
                <span style={chip('#16a34a', pCount)}>✓ {pCount} pass{pCount !== 1 ? 'es' : ''}</span>
                {apiKey && <span style={{ ...chip('#7c3aed', 1), marginLeft: 'auto' }} title="AI suggestions enabled">✨ AI</span>}
              </div>

              {/* Tabs + filter */}
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f1f5f9', padding: '0 12px', gap: 2, flexShrink: 0 }}>
                <button style={tabBtn(tab === 'violations')} onClick={() => setTab('violations')}>Violations ({vCount})</button>
                <button style={tabBtn(tab === 'warnings')}  onClick={() => setTab('warnings')}>Warnings ({wCount})</button>
                <select
                  style={{ marginLeft: 'auto', fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 5, padding: '3px 6px', color: '#475569', background: '#fff', cursor: 'pointer', outline: 'none' }}
                  value={filter}
                  onChange={e => setFilter(e.target.value as Impact)}
                >
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="serious">Serious</option>
                  <option value="moderate">Moderate</option>
                  <option value="minor">Minor</option>
                </select>
              </div>

              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
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
                      <button style={{ marginTop: 6, fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setFilter('all')}>
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
                    apiKey={apiKey}
                  />
                ))}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                <span>{pinnedEl ? '📍 pinned · ' : ''}Scanned {elapsed}{results ? ` · ${results.duration}ms` : ''}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {pinnedEl && (
                    <button style={{ ...rescanBtn, background: '#64748b' }} onClick={() => { clearAllHighlights(); setPinnedEl(null); }}>Unpin</button>
                  )}
                  <button style={rescanBtn} onClick={scan} disabled={scanning}>{scanning ? 'Scanning…' : 'Rescan'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: btnBg, color: '#fff', border: 'none', borderRadius: 22,
          padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)', userSelect: 'none',
        }}
        onClick={() => setOpen(o => !o)}
        title="Toggle WCAG Inspector (Alt+Shift+W)"
        aria-expanded={open}
      >
        <span style={{ fontSize: 14 }}>♿</span>
        {scanning
          ? <span style={{ opacity: 0.8, fontSize: 11 }}>scanning…</span>
          : vCount > 0
            ? <><span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 9, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{vCount}</span><span style={{ fontSize: 11 }}> issues</span></>
            : <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 9, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>✓</span>
        }
      </button>
    </div>
  );
};

export default WcagDevOverlay;
