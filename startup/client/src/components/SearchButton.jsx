import { useState } from "react";
import { Search } from "lucide-react";
import PropTypes from 'prop-types';
import { GlobalSearchPalette } from "./global_search_palette/GlobalSearchPalette";
import { ShortcutHint } from "./base_components/ShortcutHint";
import { SHORTCUTS } from "../constants/shortcuts";
import { shortcutTitle } from "@utils/keyboardShortcut";

function SearchButton({ collapsed }) {
  const [showSearchPalette, setShowSearchPalette] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowSearchPalette(true)}
        className={`w-full flex items-center rounded-lg hover:bg-gray-700 text-gray-300 transition-colors font-medium ${collapsed ? 'p-2 justify-center' : 'py-3 justify-start'}`}
        title={shortcutTitle("Global Search", SHORTCUTS.GLOBAL_SEARCH)}
      >
        <Search className="w-5 h-5 flex-shrink-0" size={20} />
        {!collapsed && (
          <>
            <span className="ml-2">Search</span>
            <ShortcutHint shortcut={SHORTCUTS.GLOBAL_SEARCH} />
          </>
        )}
      </button>
      
      {/* Global Search Palette */}
      {showSearchPalette && (
        <GlobalSearchPalette 
          open={showSearchPalette} 
          onClose={() => setShowSearchPalette(false)} 
        />
      )}
    </>
  );
}

SearchButton.propTypes = {
  collapsed: PropTypes.bool.isRequired
};

export { SearchButton };

