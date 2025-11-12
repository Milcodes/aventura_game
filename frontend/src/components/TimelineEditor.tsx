import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

// ============= TYPE DEFINITIONS =============
type Point = { x: number; y: number };

type Parent = 
  | { kind: 'main'; t: number }
  | { kind: 'branch'; id: string; pointIndex: number };

type MainEvent = {
  id: string;
  t: number;
  type: 'quiz' | 'note';
  title: string;
  description: string;
};

type BranchEvent = {
  id: string;
  nodeIndex: number;
  type: 'quiz' | 'note';
  title: string;
  description: string;
};

type Branch = {
  id: string;
  title: string;
  terminal: boolean;
  parent: Parent;
  points: Point[];
  depth: number;
  events: BranchEvent[];
};

type HistoryState = {
  events: MainEvent[];
  branches: Branch[];
};

// ============= CUSTOM HOOKS =============

// Geometry calculations hook
function useTimelineGeometry() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1600);
  const [zoomScale, setZoomScale] = useState(1);

  // Observe container width for responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        if (w && w !== width) setWidth(w);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [width]);

  const mainX = 140;
  const topY = 60;
  const bottomY = 520;
  const height = bottomY + 100;

  const tToY = useCallback((t: number) => topY + t * (bottomY - topY), [topY, bottomY]);
  const yToT = useCallback((y: number) => Math.min(1, Math.max(0, (y - topY) / (bottomY - topY))), [topY, bottomY]);

  const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
  const dist2 = (ax: number, ay: number, bx: number, by: number) => {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  };

  const projectPointToSegment = useCallback((px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const vx = x2 - x1, vy = y2 - y1;
    const wx = px - x1, wy = py - y1;
    const vv = vx * vx + vy * vy;
    const t = vv === 0 ? 0 : clamp01((wx * vx + wy * vy) / vv);
    return { px: x1 + t * vx, py: y1 + t * vy, t };
  }, []);

  return {
    containerRef,
    mainX, topY, bottomY, height, width,
    tToY, yToT, projectPointToSegment, dist2,
    zoomScale,
    setZoomScale
  };
}

// Undo/Redo hook
function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState) 
        : newState;
      
      setHistory(prev => [...prev.slice(0, historyIndex + 1), nextState]);
      setHistoryIndex(prev => prev + 1);
      return nextState;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setState(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setState(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { state, setState: pushState, undo, redo, canUndo, canRedo };
}

// ============= MODAL COMPONENT =============
const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, onClose, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 z-40 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} className="relative z-50 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl pointer-events-auto">
        {children}
      </div>
    </div>
  );
};

// ============= MAIN COMPONENT =============
export default function TimelineEditor() {
  const { containerRef, mainX, topY, bottomY, height, width, tToY, yToT, projectPointToSegment, dist2, zoomScale, setZoomScale } = useTimelineGeometry();
  
  // State with undo/redo
  const { 
    state: historyState, 
    setState: setHistoryState, 
    undo, redo, canUndo, canRedo 
  } = useUndoRedo<HistoryState>({
    events: [],
    branches: []
  });

  const setEvents = useCallback((updater: MainEvent[] | ((prev: MainEvent[]) => MainEvent[])) => {
    setHistoryState(prev => ({
      ...prev,
      events: typeof updater === 'function' ? updater(prev.events) : updater
    }));
  }, [setHistoryState]);

  const setBranches = useCallback((updater: Branch[] | ((prev: Branch[]) => Branch[])) => {
    setHistoryState(prev => ({
      ...prev,
      branches: typeof updater === 'function' ? updater(prev.branches) : updater
    }));
  }, [setHistoryState]);

  const events = historyState.events;
  const branches = historyState.branches;

  // Filters
  const [visibleDepths, setVisibleDepths] = useState(() => new Set([0, 1, 2, 3, 4, 5]));
  const [hiddenIds, setHiddenIds] = useState(() => new Set<string>());

  // Modals state
  const [mainModalOpen, setMainModalOpen] = useState(false);
  const [mainT, setMainT] = useState(0.5);
  const [formType, setFormType] = useState<'quiz' | 'note'>('quiz');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [nmBranchId, setNmBranchId] = useState<string | null>(null);
  const [nmIndex, setNmIndex] = useState(0);
  const [nmMode, setNmMode] = useState<'continue' | 'quiz' | 'note'>('continue');
  const [nmTitle, setNmTitle] = useState('');
  const [nmDesc, setNmDesc] = useState('');
  const [nmTerminal, setNmTerminal] = useState(false);
  const [reconnectOpen, setReconnectOpen] = useState(false);

  // Drag state with throttling
  const [drag, setDrag] = useState<{ branchId: string; index: number } | null>(null);
  const lastDragTime = useRef(0);
  const dragThrottle = 16; // 60fps

  // Colors
  const depthColors = ['#22c55e', '#eab308', '#a855f7', '#60a5fa', '#f97316', '#10b981'];
  const getDepthColor = (d: number) => depthColors[d % depthColors.length];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [undo, redo, canUndo, canRedo]);

  // Helper functions
  const uid = (pfx: string) => 
    crypto?.randomUUID?.() || `${pfx}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const depthOf = useCallback((branch: Branch): number => {
    let d = 0;
    let cur: Branch | undefined = branch;
    while (cur?.parent?.kind === 'branch') {
      const p = branches.find(b => b.id === cur!.parent.id);
      if (!p) break;
      d += 1;
      cur = p;
    }
    return d;
  }, [branches]);

  const branchById = useCallback((id: string) => branches.find(b => b.id === id), [branches]);

  const getAncestorsDescriptors = useCallback((branch: Branch) => {
    const out: any[] = [{ kind: 'main', label: 'Fővonal', x: mainX }];
    let cur: Branch | undefined = branch;
    while (cur?.parent?.kind === 'branch') {
      const p = branchById(cur.parent.id);
      if (!p) break;
      out.push({
        kind: 'branch',
        id: p.id,
        label: p.title || 'Ős ág',
        anchor: p.points[cur.parent.pointIndex]
      });
      cur = p;
    }
    return out;
  }, [branchById, mainX]);

  const ancestorsCache = useMemo(() => {
    const m = new Map<string, Branch[]>();
    for (const b of branches) {
      const list: Branch[] = [];
      let cur: Branch | undefined = b;
      while (cur?.parent?.kind === 'branch') {
        const p = branches.find(x => x.id === cur!.parent!.id);
        if (!p) break;
        list.push(p);
        cur = p;
      }
      m.set(b.id, list);
    }
    return m;
  }, [branches]);

  const getAncestorBranches = useCallback((branch: Branch): Branch[] => {
    const cached = ancestorsCache.get(branch.id);
    if (cached) return cached;
    const list: Branch[] = [];
    let cur: Branch | undefined = branch;
    while (cur?.parent?.kind === 'branch') {
      const p = branchById(cur.parent.id);
      if (!p) break;
      list.push(p);
      cur = p;
    }
    return list;
  }, [branchById, ancestorsCache]);

  const nearestProjectionOnAncestors = useCallback((branch: Branch, px: number, py: number) => {
    const ancestors = getAncestorBranches(branch);
    let best: any = null;
    for (const a of ancestors) {
      const pts = a.points;
      for (let i = 1; i < pts.length; i++) {
        const pr = projectPointToSegment(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
        const d2 = dist2(px, py, pr.px, pr.py);
        if (!best || d2 < best.dist2) {
          best = { parentId: a.id, segIndex: i, px: pr.px, py: pr.py, dist2: d2 };
        }
      }
    }
    return best;
  }, [getAncestorBranches, projectPointToSegment, dist2]);

  // Main line interaction
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (Math.abs(x - mainX) <= 14 * zoomScale && y >= topY && y <= bottomY) {
      const t = yToT(y);
      setMainT(t);
      setFormType('quiz');
      setFormTitle('');
      setFormDesc('');
      setMainModalOpen(true);
    }
  }, [mainX, topY, bottomY, yToT, zoomScale]);

  const addMainEvent = useCallback(() => {
    setEvents(prev => [...prev, {
      id: uid('ev'),
      t: mainT,
      type: formType,
      title: formTitle || (formType === 'quiz' ? 'Kvíz' : 'Jegyzet'),
      description: formDesc
    }]);
    setMainModalOpen(false);
  }, [mainT, formType, formTitle, formDesc, setEvents]);

  const createFirstLevelBranch = useCallback((title: string, terminal = false) => {
    const y = tToY(mainT);
    const newB: Branch = {
      id: uid('b'),
      title: title || 'Mellékszál',
      terminal,
      parent: { kind: 'main', t: mainT },
      points: [{ x: mainX, y }, { x: mainX + 220, y }],
      depth: 0,
      events: []
    };
    setBranches(prev => [...prev, newB]);
    setMainModalOpen(false);
  }, [mainT, mainX, tToY, setBranches]);

  // Node interactions
  const onNodeClick = useCallback((branchId: string, index: number) => {
    const b = branchById(branchId);
    if (!b) return;
    setNmBranchId(branchId);
    setNmIndex(index);
    setNmMode('continue');
    setNmTitle('');
    setNmDesc('');
    setNmTerminal(!!b.terminal);
    setNodeModalOpen(true);
  }, [branchById]);

  const onNodeMouseDown = useCallback((branchId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) setDrag({ branchId, index });
  }, []);

  const onSegmentClick = useCallback((branchId: string, segIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const b = branchById(branchId);
    if (!b) return;
    const p1 = b.points[segIndex - 1];
    const p2 = b.points[segIndex];
    if (!p1 || !p2) return;
    const pr = projectPointToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
    
    setBranches(prev => prev.map(bb => {
      if (bb.id !== branchId) return bb;
      const pts = bb.points.slice();
      pts.splice(segIndex, 0, { x: pr.px, y: pr.py });
      return { ...bb, points: pts };
    }));
    
    setNmBranchId(branchId);
    setNmIndex(segIndex);
    setNmMode('continue');
    setNmTitle('');
    setNmDesc('');
    setNodeModalOpen(true);
  }, [branchById, projectPointToSegment, setBranches]);

  const onSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag) return;
    
    const now = Date.now();
    if (now - lastDragTime.current < dragThrottle) return;
    lastDragTime.current = now;
    
    const r = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - r.left;
    let y = e.clientY - r.top;
    x = Math.max(20, Math.min(width - 20, x));
    y = Math.max(topY, Math.min(bottomY, y));
    
    const b = branchById(drag.branchId);
    if (b) {
      let snapped = false;
      if (Math.abs(x - mainX) < 14 * zoomScale) {
        x = mainX;
        snapped = true;
      }
      
      const ancestors = getAncestorsDescriptors(b).filter(a => a.kind === 'branch');
      for (const a of ancestors) {
        const ax = a.anchor?.x;
        if (ax != null && Math.abs(x - ax) < 14) {
          x = ax;
          snapped = true;
          break;
        }
      }
      
      if (!snapped) {
        const proj = nearestProjectionOnAncestors(b, x, y);
        if (proj && Math.sqrt(proj.dist2) < 12 * zoomScale) {
          x = proj.px;
          y = proj.py;
        }
      }
      
      setBranches(prev => prev.map(br => {
        if (br.id !== b.id) return br;
        const pts = br.points.map(p => ({ ...p }));
        pts[drag.index] = { x, y };
        return { ...br, points: pts };
      }));
    }
  }, [drag, width, topY, bottomY, mainX, branchById, getAncestorsDescriptors, nearestProjectionOnAncestors, setBranches, zoomScale]);

  const onSvgMouseUp = useCallback(() => {
    if (drag) setDrag(null);
  }, [drag]);

  // Node modal actions
  const applyNodeModal = useCallback(() => {
    if (!nmBranchId) return;
    setBranches(prev => prev.map(b => {
      if (b.id !== nmBranchId) return b;
      if (nmMode === 'continue') {
        const base = b.points[nmIndex];
        const step = 150;
        const newP = { x: base.x + step, y: base.y };
        const pts = [...b.points.slice(0, nmIndex + 1), newP, ...b.points.slice(nmIndex + 1)];
        return { ...b, points: pts, terminal: nmTerminal };
      }
      const ev: BranchEvent = {
        id: uid('bev'),
        nodeIndex: nmIndex,
        type: nmMode as 'quiz' | 'note',
        title: nmTitle || (nmMode === 'quiz' ? 'Kvíz' : 'Jegyzet'),
        description: nmDesc
      };
      return { ...b, terminal: nmTerminal, events: [...b.events, ev] };
    }));
    setNodeModalOpen(false);
  }, [nmBranchId, nmMode, nmIndex, nmTitle, nmDesc, nmTerminal, setBranches]);

  const deleteNodeAtCurrent = useCallback(() => {
    if (!nmBranchId) return;
    const idx = nmIndex;
    setBranches(prev => {
      let next = prev.map(b => ({
        ...b,
        points: b.points.map(p => ({ ...p })),
        parent: b.parent ? { ...b.parent } : b.parent
      }));
      const bIdx = next.findIndex(b => b.id === nmBranchId);
      if (bIdx < 0) return prev;
      const br = next[bIdx];
      
      if (idx === 0) {
        alert('A kiindulópont (anchor) nem törölhető.');
        return prev;
      }
      
      const toDelete = new Set<string>();
      function collectDescendants(rootIds: string[]) {
        const queue = [...rootIds];
        while (queue.length) {
          const rid = queue.shift()!;
          for (const bb of next) {
            if (bb.parent?.kind === 'branch' && bb.parent.id === rid) {
              toDelete.add(bb.id);
              queue.push(bb.id);
            }
          }
        }
      }
      
      const directChildren = next
        .filter(bb => bb.parent?.kind === 'branch' && bb.parent.id === br.id && bb.parent.pointIndex === idx)
        .map(bb => bb.id);
      collectDescendants(directChildren);
      
      if (toDelete.size > 0) {
        next = next.filter(bb => !toDelete.has(bb.id));
      }
      
      next = next.map(bb => {
        if (bb.parent?.kind === 'branch' && bb.parent.id === br.id) {
          if (bb.parent.pointIndex > idx) {
            return { ...bb, parent: { ...bb.parent, pointIndex: bb.parent.pointIndex - 1 } };
          }
        }
        return bb;
      });
      
      const pts = br.points.slice();
      pts.splice(idx, 1);
      
      if (pts.length < 2) {
        const branchIdToRemove = br.id;
        const descendants = new Set<string>();
        (function collectAll(rootId: string) {
          for (const bb of next) {
            if (bb.parent?.kind === 'branch' && bb.parent.id === rootId) {
              if (!descendants.has(bb.id)) {
                descendants.add(bb.id);
                collectAll(bb.id);
              }
            }
          }
        })(branchIdToRemove);
        next = next.filter(bb => bb.id !== branchIdToRemove && !descendants.has(bb.id));
      } else {
        next[bIdx] = { ...br, points: pts };
      }
      
      return next;
    });
    setNodeModalOpen(false);
  }, [nmBranchId, nmIndex, setBranches]);

  const startSubBranchAtNode = useCallback(() => {
    const b = branchById(nmBranchId!);
    if (!b) return;
    const anchor = b.points[nmIndex];
    const newB: Branch = {
      id: uid('b'),
      title: nmTitle || `Al-ág (${depthOf(b) + 2}. szint)`,
      terminal: false,
      parent: { kind: 'branch', id: b.id, pointIndex: nmIndex },
      points: [
        { x: anchor.x, y: anchor.y },
        { x: anchor.x + 160, y: anchor.y + 60 }
      ],
      depth: depthOf(b) + 1,
      events: []
    };
    setBranches(prev => [...prev, newB]);
    setNodeModalOpen(false);
  }, [nmBranchId, nmIndex, nmTitle, branchById, depthOf, setBranches]);

  const insertPointIntoParent = useCallback((parentId: string, insertAtIndex: number, x: number, y: number) => {
    setBranches(prev => {
      const next = prev.map(b => ({
        ...b,
        points: b.points.map(p => ({ ...p }))
      }));
      const pIdx = next.findIndex(b => b.id === parentId);
      if (pIdx < 0) return prev;
      const parent = next[pIdx];
      const pts = parent.points.slice();
      pts.splice(insertAtIndex, 0, { x, y });
      next[pIdx] = { ...parent, points: pts };
      
      for (let i = 0; i < next.length; i++) {
        const b = next[i];
        if (b.parent?.kind === 'branch' && b.parent.id === parentId) {
          if (b.parent.pointIndex >= insertAtIndex) {
            next[i] = { ...b, parent: { ...b.parent, pointIndex: b.parent.pointIndex + 1 } };
          }
        }
      }
      return next;
    });
  }, [setBranches]);

  const reconnectTo = useCallback((target: { x: number; y?: number }) => {
    if (!nmBranchId) return;
    setBranches(prev => prev.map(b => {
      if (b.id !== nmBranchId) return b;
      const pts = b.points.map((p, i) =>
        i === nmIndex ? { x: target.x, y: target.y ?? p.y } : p
      );
      return { ...b, points: pts };
    }));
    setReconnectOpen(false);
    setNodeModalOpen(false);
  }, [nmBranchId, nmIndex, setBranches]);

  const reconnectSmartToNearestSegment = useCallback(() => {
    const b = branchById(nmBranchId!);
    if (!b) return;
    const p = b.points[nmIndex];
    if (!p) return;
    const best = nearestProjectionOnAncestors(b, p.x, p.y);
    if (!best) return;
    
    insertPointIntoParent(best.parentId, best.segIndex, best.px, best.py);
    setBranches(prev => prev.map(bb => {
      if (bb.id !== b.id) return bb;
      const pts = bb.points.map((pp, i) =>
        i === nmIndex ? { x: best.px, y: best.py } : pp
      );
      return { ...bb, points: pts };
    }));
    setReconnectOpen(false);
    setNodeModalOpen(false);
  }, [nmBranchId, nmIndex, branchById, nearestProjectionOnAncestors, insertPointIntoParent, setBranches]);

  // Filters
  const maxDepthPresent = useMemo(() => 
    branches.reduce((m, b) => Math.max(m, b.depth || 0), 0), 
    [branches]
  );

  const toggleDepth = useCallback((d: number) => {
    setVisibleDepths(prev => {
      const n = new Set(prev);
      n.has(d) ? n.delete(d) : n.add(d);
      return n;
    });
  }, []);

  const toggleBranchVisibility = useCallback((id: string) => {
    setHiddenIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const showAll = useCallback(() => {
    setVisibleDepths(new Set([0, 1, 2, 3, 4, 5]));
    setHiddenIds(new Set());
  }, []);

  const hideAll = useCallback(() => {
    setVisibleDepths(new Set());
    setHiddenIds(new Set(branches.map(b => b.id)));
  }, [branches]);

  // Validation
  const coordsEqual = (a: Point, b: Point, eps = 1e-6) =>
    Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

  const isOriginValid = useCallback((b: Branch): boolean => {
    if (!b.parent) return false;
    const p0 = b.points[0];
    if (b.parent.kind === 'main') {
      if (Math.abs(p0.x - mainX) > 1e-6) return false;
    } else {
      const par = branchById(b.parent.id);
      if (!par) return false;
      const anch = par.points[b.parent.pointIndex];
      if (!anch) return false;
      if (!coordsEqual(p0, anch)) return false;
    }
    return true;
  }, [mainX, branchById]);

  const isTerminationValid = useCallback((b: Branch): boolean => {
    if (b.terminal) return true;
    const last = b.points[b.points.length - 1];
    if (Math.abs(last.x - mainX) < 1e-6) return true;
    
    const ancBranches = getAncestorBranches(b);
    for (const ab of ancBranches) {
      for (const pt of ab.points) {
        if (coordsEqual(last, pt)) return true;
      }
    }
    return false;
  }, [mainX, getAncestorBranches]);

  const validateBranch = useCallback((b: Branch): string[] => {
    const issues: string[] = [];
    if (!b.points || b.points.length < 2) issues.push('Nincs elég pont (min. 2).');
    if (!isOriginValid(b)) issues.push('A kiindulópont nem egyezik a szülő ankerével.');
    if (!isTerminationValid(b)) issues.push('Az ág nem tér vissza (ős pontjára / fővonalra) és nem terminál.');
    return issues;
  }, [isOriginValid, isTerminationValid]);

  const validation = useMemo(() => {
    const out = branches.map(b => ({
      id: b.id,
      title: b.title,
      issues: validateBranch(b)
    }));
    const ok = out.every(x => x.issues.length === 0);
    return { ok, details: out };
  }, [branches, validateBranch]);

  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => a.t - b.t), 
    [events]
  );

  const drawOrder = useMemo(() => {
    const arr = [...branches].sort((a, b) => a.depth - b.depth);
    return arr.filter(b => visibleDepths.has(b.depth) && !hiddenIds.has(b.id));
  }, [branches, visibleDepths, hiddenIds]);

  // Render
  return (
    <div ref={containerRef} className="mx-auto max-w-full p-6">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">RPG Idővonal Szerkesztő – TypeScript + Optimalizált</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border overflow-hidden">
            <button aria-label="Nagyítás csökkentése" onClick={() => setZoomScale(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="px-2 py-1 text-sm">−</button>
            <div className="px-2 py-1 text-sm select-none" aria-live="polite">{Math.round(zoomScale*100)}%</div>
            <button aria-label="Nagyítás növelése" onClick={() => setZoomScale(z => Math.min(2, +(z + 0.1).toFixed(2)))} className="px-2 py-1 text-sm">+</button>
          </div>
          {Array.from({ length: maxDepthPresent + 1 }).map((_, d) => (
            <label key={d} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
              <input type="checkbox" checked={visibleDepths.has(d)} onChange={() => toggleDepth(d)} />
              <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: getDepthColor(d) }}>
                szint {d + 1}
              </span>
            </label>
          ))}
          <button aria-label="Összes mutatása" className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50" onClick={showAll}>
            Összes mutatása
          </button>
          <button aria-label="Összes elrejtése" className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50" onClick={hideAll}>
            Összes elrejtése
          </button>
          <button
            className={`rounded-full px-3 py-1 text-sm font-semibold text-white ${
              validation.ok ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
            }`}
            onClick={() => {
              if (!validation.ok) alert('Nem menthető: van hibás ág. Nézd meg a lenti listát piros jelzéssel.');
              else alert('Menthető: minden ág érvényes.');
            }}
          >
            Mentés ellenőrzés
          </button>
          <div className="flex gap-1">
            <button
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={undo}
              disabled={!canUndo}
              aria-disabled={!canUndo}
              aria-label="Visszavonás"
              title="Ctrl+Z"
            >
              ↶ Visszavonás
            </button>
            <button
              className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
              onClick={redo}
              disabled={!canRedo}
              aria-disabled={!canRedo}
              aria-label="Újra"
              title="Ctrl+Y"
            >
              ↷ Újra
            </button>
          </div>
        </div>
      </header>

      <div className="relative rounded-3xl border bg-white p-4 shadow-sm">
        <svg
          width={width}
          height={height}
          className="block select-none"
          onClick={handleSvgClick}
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#grid)" />

          <line x1={mainX} y1={topY} x2={mainX} y2={bottomY} stroke="#f472b6" strokeWidth={12} strokeLinecap="round" />
          <line x1={mainX} y1={topY} x2={mainX} y2={bottomY} stroke="transparent" strokeWidth={28} />
          <circle cx={mainX} cy={topY} r={10} fill="#111827" />
          <text x={mainX + 18} y={topY + 4} className="fill-gray-800 text-sm">Start</text>
          <circle cx={mainX} cy={bottomY} r={10} fill="#111827" />
          <text x={mainX + 18} y={bottomY + 4} className="fill-gray-800 text-sm">Stop</text>

          {sortedEvents.map((ev) => {
            const y = tToY(ev.t);
            const size = 9;
            return (
              <g key={ev.id}>
                <rect
                  x={mainX - size}
                  y={y - size}
                  width={size * 2}
                  height={size * 2}
                  transform={`rotate(45 ${mainX} ${y})`}
                  fill="#111827"
                />
                <text x={mainX + 18} y={y + 4} className="fill-gray-800 text-sm">
                  {ev.title} ({ev.type})
                </text>
              </g>
            );
          })}

          {drawOrder.map((b) => {
            const color = getDepthColor(b.depth);
            const pts = b.points;
            const invalid = validateBranch(b).length > 0;
            return (
              <g key={b.id}>
                {pts[1] && (
                  <text x={pts[1].x + 12} y={pts[1].y - 10} className="fill-gray-800 text-sm">
                    {b.title}
                  </text>
                )}
                {pts.map((p, i) => {
                  if (i === 0) return null;
                  const prev = pts[i - 1];
                  return (
                    <g key={`${b.id}-segwrap-${i}`}>
                      <line
                        key={`${b.id}-seg-${i}`}
                        x1={prev.x}
                        y1={prev.y}
                        x2={p.x}
                        y2={p.y}
                        stroke={color}
                        strokeWidth={10 - Math.min(6, b.depth)}
                        strokeLinecap="round"
                        strokeDasharray={invalid ? '8 6' : undefined}
                      />
                      <line
                        x1={prev.x}
                        y1={prev.y}
                        x2={p.x}
                        y2={p.y}
                        stroke="transparent"
                        strokeWidth={28}
                        onClick={(e) => onSegmentClick(b.id, i, e)}
                      />
                    </g>
                  );
                })}
                {pts.map((p, i) => (
                  <g key={`${b.id}-pt-${i}`}>
                    {p.x === mainX && (
                      <text x={p.x + 10} y={p.y - 12} className="fill-gray-600 text-xs">
                        ↩ fővonal
                      </text>
                    )}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={i === pts.length - 1 ? 9 : 7}
                      fill="#111827"
                      className={i > 0 ? 'cursor-move' : 'cursor-pointer'}
                      onMouseDown={(e) => onNodeMouseDown(b.id, i, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeClick(b.id, i);
                      }}
                    />
                    {i === pts.length - 1 && (
                      <circle cx={p.x} cy={p.y} r={14} fill="none" stroke="#111827" strokeWidth={1} />
                    )}
                  </g>
                ))}
                {b.events.map((ev) => {
                  const p = pts[ev.nodeIndex] || pts[pts.length - 1];
                  const size = 8;
                  return (
                    <g key={ev.id}>
                      <rect
                        x={p.x + 12 - size}
                        y={p.y - size}
                        width={size * 2}
                        height={size * 2}
                        transform={`rotate(45 ${p.x + 12} ${p.y})`}
                        fill="#111827"
                      />
                      <text x={p.x + 28} y={p.y + 4} className="fill-gray-800 text-sm">
                        {ev.title} ({ev.type})
                      </text>
                    </g>
                  );
                })}
                {b.terminal && (
                  <g>
                    <line
                      x1={pts[pts.length - 1].x + 18}
                      y1={pts[pts.length - 1].y - 18}
                      x2={pts[pts.length - 1].x + 48}
                      y2={pts[pts.length - 1].y + 18}
                      stroke="#111827"
                      strokeWidth={5}
                    />
                    <line
                      x1={pts[pts.length - 1].x + 48}
                      y1={pts[pts.length - 1].y - 18}
                      x2={pts[pts.length - 1].x + 18}
                      y2={pts[pts.length - 1].y + 18}
                      stroke="#111827"
                      strokeWidth={5}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        <p className="mt-3 text-sm text-gray-600">
          Tipp: Fővonalra katt → zöld ág. Ág **bármely szakaszára** katt → beszúr egy pontot. Ctrl+Z/Y = visszavonás/újra. ESC = modal bezárás.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 lg:col-span-1">
          <h2 className="mb-2 text-lg font-semibold">Fővonal eseményei</h2>
          {sortedEvents.length === 0 ? (
            <div className="text-sm text-gray-500">Még nincs esemény.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {sortedEvents.map((ev) => (
                <li key={ev.id} className="flex items-center justify-between rounded-xl border p-2">
                  <div>
                    <div className="font-medium">
                      {ev.title} <span className="text-gray-500">({ev.type})</span>
                    </div>
                    <div className="text-xs text-gray-500">pozíció: {(ev.t * 100).toFixed(1)}%</div>
                  </div>
                  <button
                    className="rounded-full px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                    onClick={() => setEvents((arr) => arr.filter((x) => x.id !== ev.id))}
                  >
                    Törlés
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">Ágak</h2>
          {branches.length === 0 ? (
            <div className="text-sm text-gray-500">Még nincs ág.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {branches.map((b) => {
                const issues = validateBranch(b);
                return (
                  <li key={b.id} className="rounded-xl border p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: getDepthColor(b.depth) }}
                        />
                        <input
                          className="rounded-md border px-2 py-1"
                          value={b.title}
                          onChange={(e) =>
                            setBranches((prev) =>
                              prev.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x))
                            )
                          }
                        />
                        <span className="text-xs text-gray-500">szint {b.depth + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-full border px-2 py-1 hover:bg-gray-50"
                          onClick={() => toggleBranchVisibility(b.id)}
                        >
                          {hiddenIds.has(b.id) ? 'Mutat' : 'Elrejt'}
                        </button>
                        <button
                          className="rounded-full px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                          aria-label="Ág törlése"
                          onClick={() => setBranches((arr) => arr.filter((x) => x.id !== b.id))}
                        >
                          Törlés
                        </button>
                      </div>
                    </div>
                    {issues.length > 0 ? (
                      <ul className="mt-2 list-disc pl-6 text-xs text-red-600">
                        {issues.map((msg, idx) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-xs text-emerald-700">✓ Érvényes ág</div>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                      szülő: {b.parent.kind === 'main' ? 'Fővonal' : `Ág (${b.parent.id})`}{' '}
                      {b.terminal ? '• terminál (X)' : ''}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Modal open={mainModalOpen} onClose={() => setMainModalOpen(false)}>
        <div className="mb-4 text-lg font-semibold">Új elem a fővonalón ({(mainT * 100).toFixed(1)}%)</div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          <label
            className={`cursor-pointer rounded-xl border p-3 text-center ${
              formType === 'quiz' ? 'border-indigo-500 ring-2 ring-indigo-200' : ''
            }`}
          >
            <input
              type="radio"
              name="type"
              value="quiz"
              className="hidden"
              checked={formType === 'quiz'}
              onChange={() => setFormType('quiz')}
            />
            Kvíz / feladat (fővonal)
          </label>
          <label
            className={`cursor-pointer rounded-xl border p-3 text-center ${
              formType === 'note' ? 'border-indigo-500 ring-2 ring-indigo-200' : ''
            }`}
          >
            <input
              type="radio"
              name="type"
              value="note"
              className="hidden"
              checked={formType === 'note'}
              onChange={() => setFormType('note')}
            />
            Esemény / jegyzet (fővonal)
          </label>
        </div>
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Cím</label>
            <input
              className="w-full rounded-xl border p-2"
              placeholder="Pl. Kvíz a kulcsról"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Leírás (opcionális)</label>
            <textarea
              className="w-full rounded-xl border p-2"
              rows={3}
              placeholder="Rövid leírás"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            onClick={() => createFirstLevelBranch('')}
          >
            Mellékszál indítása itt
          </button>
          <div className="flex gap-2">
            <button className="rounded-xl px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setMainModalOpen(false)}>
              Mégse
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              onClick={addMainEvent}
            >
              Hozzáadás
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={nodeModalOpen} onClose={() => setNodeModalOpen(false)}>
        {(() => {
          const b = branchById(nmBranchId!);
          const anc = b ? getAncestorsDescriptors(b) : [];
          const cur = b?.points[nmIndex];
          const best = b && cur ? nearestProjectionOnAncestors(b, cur.x, cur.y) : null;
          const bestLabel = (() => {
            if (!best) return null;
            const parent = branchById(best.parentId);
            return `${parent?.title || 'Ős ág'} szakasz (${best.segIndex - 1}→${best.segIndex})`;
          })();
          return (
            <div>
              <div className="mb-4 text-lg font-semibold">Ágpont szerkesztése</div>
              <div className="mb-3 grid grid-cols-6 gap-2 text-sm">
                <label
                  className={`cursor-pointer rounded-xl border p-3 text-center ${
                    nmMode === 'continue' ? 'border-indigo-500 ring-2 ring-indigo-200' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="nm"
                    value="continue"
                    className="hidden"
                    checked={nmMode === 'continue'}
                    onChange={() => setNmMode('continue')}
                  />
                  Ág folytatása →
                </label>
                <label
                  className={`cursor-pointer rounded-xl border p-3 text-center ${
                    nmMode === 'quiz' ? 'border-indigo-500 ring-2 ring-indigo-200' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="nm"
                    value="quiz"
                    className="hidden"
                    checked={nmMode === 'quiz'}
                    onChange={() => setNmMode('quiz')}
                  />
                  Kvíz / feladat
                </label>
                <label
                  className={`cursor-pointer rounded-xl border p-3 text-center ${
                    nmMode === 'note' ? 'border-indigo-500 ring-2 ring-indigo-200' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="nm"
                    value="note"
                    className="hidden"
                    checked={nmMode === 'note'}
                    onChange={() => setNmMode('note')}
                  />
                  Esemény / jegyzet
                </label>
                <button
                  type="button"
                  className="rounded-xl border p-3 text-center hover:bg-gray-50"
                  onClick={startSubBranchAtNode}
                >
                  ➕ Új al-ág
                </button>
                <button
                  type="button"
                  className="rounded-xl border p-3 text-center hover:bg-gray-50"
                  onClick={() => setReconnectOpen(true)}
                >
                  ↩ Visszacsatlakozás…
                </button>
                <label className="flex items-center justify-center gap-2 rounded-xl border p-3 text-sm">
                  <input type="checkbox" checked={nmTerminal} onChange={(e) => setNmTerminal(e.target.checked)} />{' '}
                  Terminál (X)
                </label>
                <button
                  type="button"
                  className="col-span-6 rounded-xl border border-red-300 bg-red-50 p-3 text-center text-red-700 hover:bg-red-100"
                  onClick={deleteNodeAtCurrent}
                  title="A kiválasztott pont törlése (és az oda horgonyzott al-ágak eltávolítása)"
                  disabled={nmIndex === 0}
                >
                  🗑 Pont törlése
                </button>
              </div>

              {nmMode !== 'continue' && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Cím</label>
                    <input
                      className="w-full rounded-xl border p-2"
                      placeholder="Pl. Kép a falon"
                      value={nmTitle}
                      onChange={(e) => setNmTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Leírás</label>
                    <textarea
                      className="w-full rounded-xl border p-2"
                      rows={3}
                      placeholder="Mi történik itt?"
                      value={nmDesc}
                      onChange={(e) => setNmDesc(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {reconnectOpen && (
                <div className="mt-3 space-y-3 rounded-xl border p-3">
                  <div className="text-sm font-medium">Visszacsatlakozás célja:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {anc.map((a, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="rounded-lg border px-3 py-2 text-left hover:bg-gray-50"
                        onClick={() =>
                          reconnectTo({
                            x: a.kind === 'main' ? mainX : a.anchor?.x,
                            y: a.kind === 'main' ? undefined : a.anchor?.y,
                          })
                        }
                      >
                        ↩ {a.label}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2">
                    <div className="mb-1 text-sm font-medium">Okos visszacsatlakozás szegmensre</div>
                    <button
                      type="button"
                      className="w-full rounded-lg border px-3 py-2 text-left hover:bg-gray-50"
                      onClick={reconnectSmartToNearestSegment}
                      disabled={!best}
                      title={bestLabel || ''}
                    >
                      ↩ Legközelebbi szakasz {bestLabel ? `→ ${bestLabel}` : ''}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-xl px-4 py-2 text-sm hover:bg-gray-100" onClick={() => setNodeModalOpen(false)}>
                  Mégse
                </button>
                <button
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  onClick={applyNodeModal}
                >
                  Mentés
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}