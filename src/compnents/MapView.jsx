import { useState, useCallback } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import "./MapView.css";

const MapView = () => {
  const [truckMarker, setTruckMarker] = useState(null);
  const [dropMarker, setDropMarker] = useState(null);

  // Map container style
  const mapContainerStyle = {
    width: "100%",
    height: "600px",
    borderRadius: "8px",
  };

  // Default center (Hamilton, NZ)
  const [mapCenter] = useState({
    lat: -37.787,
    lng: 175.2793,
  });

  // Map options
  const mapOptions = {
    mapTypeId: "satellite",
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
  };

  // Handle map click to place markers
  const onMapClick = useCallback(
    (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      if (!truckMarker) {
        // First click - place truck marker
        setTruckMarker({ lat, lng });
        console.log("Truck marker placed:", lat, lng);
      } else if (!dropMarker) {
        // Second click - place drop marker
        setDropMarker({ lat, lng });
        console.log("Drop marker placed:", lat, lng);
      }
    },
    [truckMarker, dropMarker]
  );

  // Reset markers
  const resetMarkers = () => {
    setTruckMarker(null);
    setDropMarker(null);
    console.log("Markers reset");
  };

  // Continue button (for later integration)
  const handleContinue = () => {
    if (truckMarker && dropMarker) {
      alert("Map confirmed! Moving to form...");
      // TODO: Navigate to form page
    }
  };

  return (
    <div className="map-view-container">
      <div className="map-header">
        <h1>Hiab Site Planner</h1>
        <p>Step 1: Mark truck position and drop location on the map</p>
      </div>

      <div className="instructions">
        <div className="instruction-box">
          <strong>Instructions:</strong> Click on the map to place markers
          <div className="marker-legend">
            <div className="legend-item">
              <div className="legend-color blue"></div>
              <span>1st Click = Truck Position {truckMarker && "✓"}</span>
            </div>
            <div className="legend-item">
              <div className="legend-color red"></div>
              <span>2nd Click = Drop Location {dropMarker && "✓"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="map-wrapper">
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={18}
            options={mapOptions}
            onClick={onMapClick}
          >
            {/* Truck Marker (Blue) */}
            {truckMarker && (
              <Marker
                position={truckMarker}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: "#3B82F6",
                  fillOpacity: 1,
                  strokeColor: "#1E40AF",
                  strokeWeight: 3,
                }}
                title="Truck Position"
              />
            )}

            {/* Drop Marker (Red) */}
            {dropMarker && (
              <Marker
                position={dropMarker}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: "#EF4444",
                  fillOpacity: 1,
                  strokeColor: "#991B1B",
                  strokeWeight: 3,
                }}
                title="Drop Location"
              />
            )}
          </GoogleMap>
        </LoadScript>
      </div>

      <div className="button-container">
        <button className="btn btn-secondary" onClick={resetMarkers}>
          Reset Markers
        </button>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!truckMarker || !dropMarker}
        >
          Continue to Form →
        </button>
      </div>
    </div>
  );
};

export default MapView;
