import { TextTypeField } from '@startup/components/base_components/fields/TextTypeField';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Search, ZoomIn, ZoomOut, Crosshair, ChevronRight, CornerLeftUp } from 'lucide-react';
import { OrgChartCard } from './OrgChartCard';
import { OrgChartLevel } from './OrgChartLevel';
import { clamp } from '@utils/toValidNumber';

const CARD_REACH = 284;

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.4;

const clampZoom = (value) => clamp(value, ZOOM_MIN, ZOOM_MAX);


const findPath = (node, id, trail = []) => {
  const path = [...trail, node];
  if (String(node.id) === String(id)) {
    return path;
  }
  for (const child of node.children || []) {
    const found = findPath(child, id, path);
    if (found) {
      return found;
    }
  }
  return null;
};

const searchNodes = (node, term, trail = [], found = []) => {
  const path = [...trail, node];
  if (`${node.title || ''} ${node.subtitle || ''}`.toLowerCase().includes(term)) {
    found.push({ node, path });
  }
  (node.children || []).forEach((child) => searchNodes(child, term, path, found));
  return found;
};

const MAX_RESULTS = 8;
const CANVAS_PADDING = 64;

const OrgChart = ({ root, onOpen, onSelect, overlay, toolbar, searchPlaceholder = 'Search...', emptyText = 'Nothing to show yet.' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [focusId, setFocusId] = useState(String(root.id));
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const overlayRef = useRef(null);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const term = searchTerm.trim().toLowerCase();
  const results = useMemo(
    () => (term.length < 2 ? [] : searchNodes(root, term).slice(0, MAX_RESULTS)),
    [root, term]
  );

  const applyTransform = useCallback(() => {
    if (canvasRef.current) {
      const { x, y } = offsetRef.current;
      canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    }
  }, [zoom]);

  useEffect(applyTransform, [applyTransform]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => setViewportWidth(entry.contentRect.width));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const path = useMemo(() => findPath(root, focusId) || [root], [root, focusId]);
  const focused = path[path.length - 1];
  const children = focused?.children || [];

  // Opening a node makes it the one on top, with its children below it. A node
  // marked lazy is told, so a caller can fetch what that card needs.
  const focus = useCallback((node) => {
    setFocusId(String(node.id));
    setSearchTerm('');
    offsetRef.current = { x: 0, y: 0 };
    applyTransform();
    if (node.lazy) {
      onOpen?.(node);
    }
  }, [onOpen, applyTransform]);

  const handleCardClick = useCallback((node) => {
    // A node with something under it drills in; a leaf just reports the click.
    if (node.lazy || (node.children || []).length > 0) {
      focus(node);
      return;
    }
    onSelect?.(node);
  }, [focus, onSelect]);

  const goUp = () => {
    if (path.length > 1) {
      focus(path[path.length - 2]);
    }
  };

  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP));
  const resetView = () => {
    setZoom(1);
    offsetRef.current = { x: 0, y: 0 };
    applyTransform();
  };

  const clampOffset = useCallback((next) => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) {
      return next;
    }
    const maxDown = Math.max(0, canvas.scrollHeight * zoom - viewport.clientHeight);
    const maxSide = Math.max(0, canvas.scrollWidth * zoom - viewport.clientWidth);
    return {
      x: clamp(next.x, -maxSide, maxSide),
      y: clamp(next.y, -maxDown, 0)
    };
  }, [zoom]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setZoom((z) => clampZoom(z - Math.sign(e.deltaY) * ZOOM_STEP));
        return;
      }
      offsetRef.current = clampOffset({
        x: offsetRef.current.x - e.deltaX,
        y: offsetRef.current.y - e.deltaY
      });
      applyTransform();
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [applyTransform, clampOffset, focused]);

  useEffect(() => {
    const element = overlayRef.current;
    const viewport = viewportRef.current;
    if (!element || !viewport || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const collides = viewport.clientWidth < 2 * (width + CARD_REACH);
      setOverlayHeight(collides ? height : 0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [overlay]);

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    dragRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
  };
  const handleMouseMove = (e) => {
    if (!dragRef.current) return;
    offsetRef.current = clampOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
    applyTransform();
  };
  const endDrag = () => { dragRef.current = null; };

  const renderResult = ({ node, path: trail }) => (
    <button
      key={`result-${node.id}`}
      type="button"
      onClick={() => focus(node)}
      className="block w-full px-3 py-2 text-left hover:bg-slate-50"
    >
      <div className="truncate text-sm font-medium text-slate-800">{node.title}</div>
      <div className="truncate text-[11px] text-slate-500">
        {trail.slice(0, -1).map((step) => step.title).join(' › ') || 'top'}
      </div>
    </button>
  );

  const renderCrumb = (node, index) => (
    <span key={node.id} className="inline-flex items-center">
      {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 mx-0.5" />}
      <button
        type="button"
        onClick={() => focus(node)}
        className={`px-1.5 py-0.5 rounded text-sm ${index === path.length - 1
          ? 'font-semibold text-slate-900'
          : 'text-blue-600 hover:bg-blue-50'}`}
      >
        {node.title}
      </button>
    </span>
  );

  const renderChild = (node) => {
    const childrenNodes = node.children || [];
    const card = (
      <OrgChartCard
        key={node.id}
        node={node}
        openable={Boolean(node.lazy) || childrenNodes.length > 0}
        onSelect={() => handleCardClick(node)}
      />
    );
    if (!node.showChildren || childrenNodes.length === 0) {
      return card;
    }
    return (
      <OrgChartLevel
        key={node.id}
        parent={card}
        childrenNodes={childrenNodes}
        childrenLabel={node.childrenLabel}
        renderChild={renderChild}
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {toolbar}
        <div className="relative flex-1 min-w-[14rem] max-w-md">
          <TextTypeField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={searchPlaceholder}
            icon={<Search className="w-4 h-4 text-slate-400" />}
            className="!text-sm"
          />
          {term.length >= 2 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No match for &quot;{searchTerm}&quot;</p>
              ) : (
                results.map(renderResult)
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={goUp} disabled={path.length < 2} title="Go up one level"
            className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-md disabled:text-slate-300 disabled:hover:bg-transparent">
            <CornerLeftUp className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <button type="button" onClick={zoomOut} title="Zoom out" className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-md">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-600 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={zoomIn} title="Zoom in" className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-md">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button type="button" onClick={resetView} title="Reset view" className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-md">
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!focused ? (
        <p className="text-sm text-slate-500 py-10 text-center">{emptyText}</p>
      ) : (
        <div
          ref={viewportRef}
          className="relative flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100/70 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] shadow-inner cursor-grab active:cursor-grabbing"
          style={overlayHeight ? { paddingTop: overlayHeight + 24 } : undefined}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          <div ref={canvasRef} className="flex min-h-full w-max min-w-full origin-top items-start justify-center px-8 pt-4 pb-8">
            <div>
              <OrgChartLevel
                parent={<OrgChartCard node={focused} expanded />}
                childrenNodes={children}
                childrenLabel={focused.childrenLabel}
                renderChild={renderChild}
                availableWidth={Math.max(0, viewportWidth - CANVAS_PADDING)}
              />
              {children.length === 0 && (
                <p className="mt-4 text-center text-sm text-slate-500">Nothing under this yet.</p>
              )}
            </div>
          </div>

          <div className="absolute top-3 left-3 flex flex-wrap items-center rounded-md border border-slate-200 bg-white/95 px-2 py-1 shadow-sm ring-1 ring-slate-900/5 backdrop-blur">
            {path.map(renderCrumb)}
          </div>
          {overlay && <div ref={overlayRef} className="absolute top-3 right-3">{overlay}</div>}
          <p className="absolute bottom-2 right-3 rounded bg-white/80 px-2 py-0.5 text-[11px] text-slate-500 backdrop-blur pointer-events-none">
            click a box to open it · scroll or drag to move · ctrl + wheel to zoom
          </p>
        </div>
      )}
    </div>
  );
};

OrgChart.propTypes = {
  root: PropTypes.object.isRequired,
  onOpen: PropTypes.func,
  onSelect: PropTypes.func,
  overlay: PropTypes.node,
  toolbar: PropTypes.node,
  searchPlaceholder: PropTypes.string,
  emptyText: PropTypes.string,
};

export { OrgChart };
