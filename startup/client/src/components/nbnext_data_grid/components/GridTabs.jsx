import PropTypes from "prop-types";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// Tailwind JIT needs literal class strings, so we keep a small palette map
// instead of building class names dynamically. A tab picks its palette via
// `color` (optional on the tab shape); defaults to blue.
const COLOR_PALETTE = {
  blue: {
    active: "bg-blue-600 text-white",
    dot: "bg-blue-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-blue-700",
  },
  emerald: {
    active: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-emerald-700",
  },
  amber: {
    active: "bg-amber-500 text-white",
    dot: "bg-amber-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-amber-700",
  },
  rose: {
    active: "bg-rose-600 text-white",
    dot: "bg-rose-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-rose-700",
  },
  violet: {
    active: "bg-violet-600 text-white",
    dot: "bg-violet-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-violet-700",
  },
  indigo: {
    active: "bg-indigo-600 text-white",
    dot: "bg-indigo-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-indigo-700",
  },
  teal: {
    active: "bg-teal-600 text-white",
    dot: "bg-teal-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-teal-700",
  },
  slate: {
    active: "bg-slate-700 text-white",
    dot: "bg-slate-500",
    dotActive: "bg-white/90",
    inactive: "text-slate-600 hover:text-slate-900",
  },
};

// Scroll by roughly one average tab per click.
const SCROLL_STEP_PX = 140;
// Tolerance for floating-point scroll-end detection.
const SCROLL_END_EPSILON = 1;

const resolvePalette = (color) => COLOR_PALETTE[color] || COLOR_PALETTE.blue;

function TabButton({ tab, isActive, onTabChange }) {
  const handleClick = useCallback(() => {
    if (!isActive) onTabChange(tab.id);
  }, [isActive, onTabChange, tab.id]);

  const palette = resolvePalette(tab.color);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={handleClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
        isActive ? `${palette.active} shadow-sm` : palette.inactive
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isActive ? palette.dotActive : palette.dot}`}
      />
      {tab.label}
    </button>
  );
}

TabButton.propTypes = {
  tab: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.node.isRequired,
    color: PropTypes.oneOf(Object.keys(COLOR_PALETTE)),
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

function ScrollArrow({ direction, onClick }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll tabs left" : "Scroll tabs right"}
      className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
    >
      <Icon size={14} />
    </button>
  );
}

ScrollArrow.propTypes = {
  direction: PropTypes.oneOf(["left", "right"]).isRequired,
  onClick: PropTypes.func.isRequired,
};

function InsightsToggleButton({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="ml-auto shrink-0 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      title={collapsed ? "Show insights" : "Hide insights"}
    >
      <span>Insights</span>
      <ChevronDown
        size={14}
        className={`transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
      />
    </button>
  );
}

InsightsToggleButton.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

// Top bar that hosts (optionally) read-only tabs on the left and (optionally)
// the insights toggle on the right. Renders nothing when neither is present,
// so callers can always mount it unconditionally.
function GridTabs({
  tabs,
  activeTabId,
  onTabChange,
  insightsAvailable = false,
  insightsCollapsed = true,
  onToggleInsights,
}) {
  const hasTabs = Array.isArray(tabs) && tabs.length > 0;
  const showInsightsToggle = insightsAvailable && typeof onToggleInsights === "function";

  // Ref-callback via useState so the overflow effect re-runs when the scroll
  // container mounts/unmounts (e.g. when tabs are toggled on).
  const [scrollEl, setScrollEl] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!scrollEl) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return undefined;
    }

    const update = () => {
      const { scrollLeft, clientWidth, scrollWidth } = scrollEl;
      setCanScrollLeft(scrollLeft > SCROLL_END_EPSILON);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - SCROLL_END_EPSILON);
    };

    update();
    scrollEl.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [scrollEl, tabs]);

  const handleScrollLeft = useCallback(() => {
    scrollEl?.scrollBy({ left: -SCROLL_STEP_PX, behavior: "smooth" });
  }, [scrollEl]);

  const handleScrollRight = useCallback(() => {
    scrollEl?.scrollBy({ left: SCROLL_STEP_PX, behavior: "smooth" });
  }, [scrollEl]);

  if (!hasTabs && !showInsightsToggle) return null;

  return (
    <div className="mb-2 flex w-full items-center gap-2">
      {hasTabs && (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {canScrollLeft && <ScrollArrow direction="left" onClick={handleScrollLeft} />}
          <div
            ref={setScrollEl}
            className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
          >
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onTabChange={onTabChange}
              />
            ))}
          </div>
          {canScrollRight && <ScrollArrow direction="right" onClick={handleScrollRight} />}
        </div>
      )}
      {showInsightsToggle && (
        <InsightsToggleButton collapsed={insightsCollapsed} onToggle={onToggleInsights} />
      )}
    </div>
  );
}

GridTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.node.isRequired,
      color: PropTypes.oneOf(Object.keys(COLOR_PALETTE)),
    })
  ),
  activeTabId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onTabChange: PropTypes.func,
  insightsAvailable: PropTypes.bool,
  insightsCollapsed: PropTypes.bool,
  onToggleInsights: PropTypes.func,
};

export { GridTabs };
