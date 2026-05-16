import { useCallback, useEffect, useState } from "react";
import { DEFAULT_THEME_ID, getNextThemeId, getTheme } from "../utils/themes";

/**
 * Resolves the active theme + exposes a cycler.
 *
 * The default comes from the `theme` prop on NbNextDataGrid. Users can
 * override it locally via the bottom-toolbar toggle; that override lives
 * in component state only (no persistence).
 */
const useGridTheme = (defaultThemeId = DEFAULT_THEME_ID) => {
  const [activeId, setActiveId] = useState(defaultThemeId);

  useEffect(() => {
    setActiveId(defaultThemeId);
  }, [defaultThemeId]);

  const cycle = useCallback(() => {
    setActiveId((id) => getNextThemeId(id));
  }, []);

  const theme = getTheme(activeId);

  return { theme, cycleTheme: cycle };
};

export { useGridTheme };
