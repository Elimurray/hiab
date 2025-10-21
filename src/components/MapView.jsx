import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useDelivery } from "../context/DeliveryContext";
import "./MapView.css";

const MapView = () => {
  const navigate = useNavigate();
  const { markers, mapCenter, updateMarkers, updateMapCenter } = useDelivery();

  const [truckMarker, setTruckMarker] = useState(markers.truck);
  const [dropMarker, setDropMarker] = useState(markers.drop);

  // Reference map instance
  const mapRef = useRef(null);

  const mapContainerStyle = {
    width: "100%",
    height: "600px",
    borderRadius: "8px",
  };

  const mapOptions = {
    mapTypeId: "satellite",
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
  };

  // Store map instance when loaded
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapClick = useCallback(
    (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      if (!truckMarker) {
        setTruckMarker({ lat, lng });
        console.log("Truck marker placed:", lat, lng);
      } else if (!dropMarker) {
        setDropMarker({ lat, lng });
        console.log("Drop marker placed:", lat, lng);
      }
    },
    [truckMarker, dropMarker]
  );

  const resetMarkers = () => {
    setTruckMarker(null);
    setDropMarker(null);
    console.log("Markers reset");
  };

  const handleContinue = () => {
    if (truckMarker && dropMarker) {
      // Get the CURRENT center of the map before navigating
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        const currentLat = center.lat();
        const currentLng = center.lng();

        // Save current map position to context
        updateMapCenter(currentLat, currentLng);
        console.log("Map center saved:", { lat: currentLat, lng: currentLng });
      }

      // Save markers to context
      updateMarkers(truckMarker, dropMarker);
      console.log("Markers saved to context:", { truckMarker, dropMarker });

      navigate("/form");
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
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter} // Load from context
          zoom={18}
          options={mapOptions}
          onClick={onMapClick}
          onLoad={onMapLoad} // ADD THIS - capture map reference
        >
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
