import { RefreshCcw } from "lucide-react";
import { clearCacheAndReload } from "@utils/clearCacheAndReload";
import { shortcutTitle } from "@utils/keyboardShortcut";
import { SHORTCUTS } from "../constants/shortcuts";
import { ShortcutHint } from "./base_components/ShortcutHint";

function ClearCacheButton() {
  return (
    <button
      type="button"
      onClick={clearCacheAndReload}
      title={shortcutTitle("Clear cache and refresh", SHORTCUTS.CLEAR_CACHE_REFRESH)}
      className="w-full flex items-center rounded-lg hover:bg-gray-700 text-gray-300 transition-colors font-medium py-3 justify-start"
    >
      <RefreshCcw className="w-5 h-5 flex-shrink-0" size={20} />
      <span className="ml-2">Clear cache</span>
      <ShortcutHint shortcut={SHORTCUTS.CLEAR_CACHE_REFRESH} />
    </button>
  );
}

export { ClearCacheButton };
