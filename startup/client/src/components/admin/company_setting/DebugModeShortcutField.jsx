import { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Keyboard, X } from "lucide-react";
import { formatShortcut } from "../../../utils/keyboardShortcut";

function DebugModeShortcutField({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const [hint, setHint] = useState("");

  const startRecording = useCallback(() => {
    setRecording(true);
    setHint("");
  }, []);

  const stopRecording = useCallback(() => {
    setRecording(false);
    setHint("");
  }, []);

  const clearShortcut = useCallback(() => onChange(""), [onChange]);

  const handleKeyDown = (e) => {
    e.preventDefault();
    if (e.key === "Escape") {
      setRecording(false);
      setHint("");
      return;
    }

    const shortcut = formatShortcut(e);
    if (!shortcut) {
      setHint("Hold a modifier (Ctrl, Alt, Shift or Cmd) and press a key.");
      return;
    }

    onChange(shortcut);
    setRecording(false);
    setHint("");
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Debug Mode Shortcut</label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={startRecording}
          onBlur={stopRecording}
          onKeyDown={recording ? handleKeyDown : undefined}
          className={`flex-1 flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm shadow-sm text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            recording
              ? "border-indigo-500 ring-2 ring-indigo-500 text-indigo-700 bg-indigo-50"
              : "border-gray-300 text-gray-900"
          }`}
        >
          <Keyboard className="w-4 h-4 text-gray-500 shrink-0" />
          {recording ? (
            <span className="text-indigo-700">Press the keys…</span>
          ) : (
            <span className={value ? "font-medium" : "text-gray-400"}>{value || "Not set"}</span>
          )}
        </button>

        {value ? (
          <button
            type="button"
            onClick={clearShortcut}
            title="Clear shortcut"
            className="p-2.5 border border-gray-300 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-gray-400">
        {hint || "Click, then press the combination. Cleared means nobody in this company can turn debug mode on."}
      </p>
    </div>
  );
}

DebugModeShortcutField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export { DebugModeShortcutField };
