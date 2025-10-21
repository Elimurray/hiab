import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useDelivery } from "../context/DeliveryContext";
import "./MapView.css";

const MapView = () => {
  const navigate = useNavigate();
  const { markers, mapCenter, updateMarkers, updateMapCenter } = useDelivery();

  const [truckMarker, setTruckMarker] = useState(markers.truck);
  const [dropMarker, setDropMarker] = useState(markers.drop);
  const [error, setError] = useState(null); // State for geolocation errors

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

  // Function to get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLocation = { lat: latitude, lng: longitude };

          // Update map center to current location only if not already set
          if (!truckMarker && !dropMarker) {
            updateMapCenter(latitude, longitude);
            console.log("Current location set as map center:", currentLocation);
          }

          // Pan map to current location
          if (mapRef.current) {
            mapRef.current.panTo(currentLocation);
          }

          setError(null); // Clear any previous errors
        },
        (err) => {
          // Handle geolocation errors
          setError(
            err.message || "Unable to retrieve location. Please try again."
          );
          console.error("Geolocation error:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds timeout
          maximumAge: 0, // No cached position
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      console.error("Geolocation not supported");
    }
  }, [truckMarker, dropMarker, updateMapCenter]);

  // Fetch current location only once on mount
  useEffect(() => {
    getCurrentLocation();
  }, []); // Empty dependency array to run only on mount

  const resetMarkers = () => {
    setTruckMarker(null);
    setDropMarker(null);
    setError(null); // Clear error on reset
    console.log("Markers reset");
    // Optionally re-center map to current location
    getCurrentLocation();
  };

  const handleContinue = () => {
    if (truckMarker && dropMarker) {
      // Get the current center of the map before navigating
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
          <strong>Instructions:</strong> Click on the map to place markers or
          use your current location.
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

      {error && (
        <div
          className="error-message"
          style={{ color: "red", margin: "10px 0" }}
        >
          {error}
        </div>
      )}

      <div className="map-wrapper">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={18}
          options={mapOptions}
          onClick={onMapClick}
          onLoad={onMapLoad}
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
        <button className="btn btn-secondary" onClick={getCurrentLocation}>
          Use Current Location
        </button>
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
