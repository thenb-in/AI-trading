import { useState, useCallback, useMemo } from "react";
import {
  TOOLBAR_BTN_CLASS,
  TOOLBAR_BTN_VARIANT_CLASS,
  TOOLBAR_ICON_TONE_CLASS,
} from "../utils/toolbarStyles.js";

/**
 * Build a render prop for NbNextDataGrid `renderToolbarExtras`.
 * Each action fires with the same export payload shape as `ref.getExportData()`.
 *
 * @param {Array<{
 *   id: string,
 *   label: string,
 *   onClick: (payload: object) => void | Promise<void>,
 *   icon?: import('react').ComponentType<{ size?: number, className?: string, strokeWidth?: number }>,
 *   title?: string,
 *   variant?: 'default' | 'rose' | 'emerald',
 *   toolbarPosition?: 'top' | 'bottom' | 'both',
 * }>} actions
 * @returns {{ renderToolbarExtras: (api: { getExportPayload: () => object, disabled: boolean, position?: string }) => import('react').ReactNode }}
 */
function useNbNextDataGridToolbarExtras(actions = []) {
  const [loadingActionId, setLoadingActionId] = useState(null);

  const stableActions = useMemo(() => (Array.isArray(actions) ? actions : []), [actions]);

  const renderToolbarExtras = useCallback(
    ({ getExportPayload, disabled, position = "top" }) => {
      if (!stableActions.length || typeof getExportPayload !== "function") return null;

      const actionsForBar = stableActions.filter((action) => {
        const tp = action.toolbarPosition ?? "top";
        return tp === "both" || tp === position;
      });

      if (!actionsForBar.length) return null;

      return (
        <div className="flex items-center gap-1.5">
          {actionsForBar.map((action) => {
            const { id, label, onClick, icon: Icon, title, variant = "default" } = action;
            if (!id || !label || typeof onClick !== "function") return null;

            const isLoading    = loadingActionId === id;
            const variantClass = TOOLBAR_BTN_VARIANT_CLASS[variant] || "";
            const iconTone     = TOOLBAR_ICON_TONE_CLASS[variant] || TOOLBAR_ICON_TONE_CLASS.default;

            const handleClick = async () => {
              let payload;
              try {
                payload = getExportPayload();
              } catch (err) {
                console.error(`[useNbNextDataGridToolbarExtras] getExportPayload failed actionId=${id}`, err);
                return;
              }
              if (!payload?.rows?.length) return;
              setLoadingActionId(id);
              try {
                await onClick(payload);
              } catch (err) {
                console.error(`[useNbNextDataGridToolbarExtras] onClick failed actionId=${id}`, err);
              } finally {
                setLoadingActionId(null);
              }
            };

            return (
              <button
                key={id}
                type="button"
                onClick={() => { void handleClick(); }}
                disabled={disabled || isLoading}
                className={`${TOOLBAR_BTN_CLASS} ${variantClass}`.trim()}
                title={title || label}
                aria-label={title || label}
              >
                {isLoading ? (
                  <span
                    className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"
                    aria-hidden
                  />
                ) : Icon ? (
                  <Icon size={14} className={`${iconTone} shrink-0`} strokeWidth={2} aria-hidden />
                ) : null}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      );
    },
    [loadingActionId, stableActions]
  );

  return { renderToolbarExtras };
}

export { useNbNextDataGridToolbarExtras };
