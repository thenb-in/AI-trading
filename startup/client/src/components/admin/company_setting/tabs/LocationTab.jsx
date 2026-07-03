import { MapPin } from "lucide-react";
import { GeofencingFields } from "../../GeofencingFields";
import { SettingsCard } from "../SettingsCard";
import { useCompanySettingsContext } from "../companySettingsContextCore";

function LocationTab() {
  const {
    companySettings,
    handleLatitudeChange,
    handleLongitudeChange,
    handleGeofenceRadiusChange,
    handleLocationAutoFill,
  } = useCompanySettingsContext();

  return (
    <div className="max-w-3xl mx-auto">
      <SettingsCard
        icon={MapPin}
        title="Geofence"
        subtitle="Configure the geofence radius for location-based app activities."
      >
        <GeofencingFields
          latitude={companySettings.latitude}
          longitude={companySettings.longitude}
          onLatitudeChange={handleLatitudeChange}
          onLongitudeChange={handleLongitudeChange}
          onAutoFill={handleLocationAutoFill}
          radius={companySettings.geofence_radius_meters}
          onRadiusChange={handleGeofenceRadiusChange}
        />
      </SettingsCard>
    </div>
  );
}

export { LocationTab };
