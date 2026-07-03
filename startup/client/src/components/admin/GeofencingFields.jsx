import { useState } from "react";
import PropTypes from "prop-types";
import { MapPin, Shield, Info, LocateFixed, Loader } from "lucide-react";

function GeofencingFields({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  onAutoFill,
  radius,
  onRadiusChange,
  radiusPlaceholder = "e.g. 500",
  compact = false,
}) {

  const showRadius = typeof onRadiusChange === "function";
  const twoColClass = compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState("");

  const isConfigured =
    String(latitude ?? "").trim() !== "" && String(longitude ?? "").trim() !== "";

  const detectLocation = () => {
    setLocError("");
    if (!("geolocation" in navigator)) {
      setLocError("Geolocation is not supported by this browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onAutoFill(lat.toFixed(7), lng.toFixed(7));
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocError("Location permission denied. Please allow access and try again.");
        } else if (error.code === error.TIMEOUT) {
          setLocError("Timed out while fetching location. Please try again.");
        } else {
          setLocError("Unable to fetch location. Please enter it manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      {/* Privacy notice */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="text-indigo-600 mt-0.5 shrink-0" size={18} />
        <div className="flex-1 min-w-0">
          <h4 className="text-indigo-800 font-semibold text-sm">Data Privacy &amp; Security</h4>
          <p className="text-indigo-700 text-xs mt-1 break-words">
            Location data is encrypted and used solely to enforce proximity-based access.
            Users are granted access only when within the configured radius of these coordinates.
          </p>
        </div>
      </div>

      {/* Header */}
      <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <MapPin size={18} className="text-indigo-600" />
        Location-Based Access Control
      </h4>

      {/* Coordinate inputs */}
      <div className={`grid ${twoColClass} gap-4`}>
        <div className="space-y-1.5">
          <label className="text-gray-700 font-medium text-sm flex items-center gap-1.5">
            Latitude
            <Info size={14} className="text-gray-400" title="A value between -90 and 90 degrees" />
          </label>
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={latitude}
            onChange={onLatitudeChange}
            placeholder="e.g. 19.0760"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-700 font-medium text-sm flex items-center gap-1.5">
            Longitude
            <Info size={14} className="text-gray-400" title="A value between -180 and 180 degrees" />
          </label>
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={longitude}
            onChange={onLongitudeChange}
            placeholder="e.g. 72.8777"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {showRadius && (
          <div className="space-y-1.5">
            <label className="text-gray-700 font-medium text-sm flex items-center gap-1.5">
              Access Radius (meters)
              <Info size={14} className="text-gray-400" title="Punches are allowed within this many meters of the coordinates" />
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={radius ?? ""}
              onChange={onRadiusChange}
              placeholder={radiusPlaceholder}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        )}
      </div>

      {locError && <p className="text-red-500 text-xs -mt-3">{locError}</p>}

      {/* Detect button */}
      <button
        type="button"
        onClick={detectLocation}
        disabled={isLocating}
        className="flex items-center gap-2 bg-white border border-indigo-500 text-indigo-600 font-medium px-5 py-2 rounded-lg hover:bg-indigo-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLocating ? <Loader size={18} className="animate-spin" /> : <LocateFixed size={18} />}
        {isLocating ? "Detecting..." : "Detect Current Location"}
      </button>

      {/* About panel */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
        <h4 className="text-gray-800 font-semibold mb-3 flex items-center gap-2 text-sm">
          <Info size={16} className="text-indigo-600" />
          About Geofencing
        </h4>
        <div className={`grid ${twoColClass} gap-3 text-sm text-gray-700`}>
          {[
            "Specify the primary location coordinates.",
            "Use \"Detect Current Location\" to auto-fill from your device.",
            "Access is restricted to users within the configured radius.",
            "Leave both fields blank to disable location-based access.",
          ].map((text) => (
            <div key={text} className="flex items-start gap-2 min-w-0">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0" />
              <p className="min-w-0 break-words">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status indicator */}
      {isConfigured && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm font-medium">
            ✓ Geofencing configured at {latitude}, {longitude}
            {showRadius && radius ? ` (within ${radius} m)` : ""}.
          </p>
        </div>
      )}
    </div>
  );
}

GeofencingFields.propTypes = {
  latitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  longitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onLatitudeChange: PropTypes.func.isRequired,
  onLongitudeChange: PropTypes.func.isRequired,
  onAutoFill: PropTypes.func.isRequired,
  radius: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onRadiusChange: PropTypes.func,
  radiusPlaceholder: PropTypes.string,
  compact: PropTypes.bool,
};

export { GeofencingFields };
