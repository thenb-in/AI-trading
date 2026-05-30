import { useState } from "react";
import PropTypes from "prop-types";
import { MapPin, LocateFixed, Loader } from "lucide-react";

/**
 * Company location (latitude/longitude) inputs with a "detect my location"
 */
function CompanyLocationFields({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  onAutoFill,
}) {
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState("");

  const handleDetectLocation = () => {
    setLocError("");

    if (!("geolocation" in navigator)) {
      setLocError("Geolocation is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        // 7 decimal places ≈ 1cm precision, matches the DECIMAL(10,7) column.
        onAutoFill(lat.toFixed(7), lng.toFixed(7));
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocError(
            "Location permission denied. Please allow access and try again."
          );
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
    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center text-gray-700 font-medium">
          <MapPin className="w-4 h-4 text-gray-600 mr-2" /> Company Location
        </label>
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isLocating}
          title="Detect my location"
          aria-label="Detect my location"
          className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md transition-all ${
            isLocating
              ? "text-gray-400 cursor-not-allowed"
              : "text-indigo-600 hover:bg-indigo-50"
          }`}
        >
          {isLocating ? (
            <Loader size={18} className="animate-spin" />
          ) : (
            <LocateFixed size={18} />
          )}
          <span className="hidden sm:inline">
            {isLocating ? "Detecting..." : "Use my location"}
          </span>
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Latitude and longitude in decimal degrees. Click the location icon to
        auto-fill from your device, or enter manually. Leave blank if not
        applicable.
      </p>

      {locError && <p className="text-xs text-red-600 mb-3">{locError}</p>}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">Latitude</label>
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
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">Longitude</label>
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
      </div>
    </div>
  );
}

CompanyLocationFields.propTypes = {
  latitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  longitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onLatitudeChange: PropTypes.func.isRequired,
  onLongitudeChange: PropTypes.func.isRequired,
  onAutoFill: PropTypes.func.isRequired,
};

export { CompanyLocationFields };
