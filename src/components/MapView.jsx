import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap } from "@react-google-maps/api";
import { useDelivery } from "../context/DeliveryContext";
import html2canvas from "html2canvas";
import "./MapView.css";

const MapView = () => {
  const navigate = useNavigate();
  const { mapCenter, updateMapCenter, updateMapScreenshot } = useDelivery();

  const [error, setError] = useState(null); // State for geolocation errors
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

  // Function to get current location
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLocation = { lat: latitude, lng: longitude };

          // Update map center
          updateMapCenter(latitude, longitude);
          console.log("Current location set as map center:", currentLocation);

          // Pan map to current location
          if (mapRef.current) {
            mapRef.current.panTo(currentLocation);
          }

          setError(null); // Clear any previous errors
        },
        (err) => {
          setError(
            err.message || "Unable to retrieve location. Please try again."
          );
          console.error("Geolocation error:", err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      console.error("Geolocation not supported");
    }
  }, [updateMapCenter]);

  // Fetch current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []); // Empty dependency array

  // Capture map screenshot and navigate to design plan
  const handleGoToDesignPlan = async () => {
    if (mapRef.current) {
      try {
        const mapElement = document.querySelector(".map-wrapper > div");
        if (mapElement) {
          const canvas = await html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            scale: 2,
          });
          const screenshot = canvas.toDataURL("image/png");
          updateMapScreenshot(screenshot);
          console.log("Map screenshot captured");

          // Save current map center
          const center = mapRef.current.getCenter();
          updateMapCenter(center.lat(), center.lng());
          console.log("Map center saved:", {
            lat: center.lat(),
            lng: center.lng(),
          });

          navigate("/design-plan");
        }
      } catch (err) {
        setError("Failed to capture map screenshot. Please try again.");
        console.error("Screenshot error:", err);
      }
    }
  };

  return (
    <div className="map-view-container">
      <div className="map-header">
        <h1>Hiab Site Planner</h1>
        <p>Step 1: Select your map area for the design plan</p>
      </div>

      <div className="instructions">
        <div className="instruction-box">
          <strong>Instructions:</strong> Use the map to find your desired area,
          then click "Go to Design Plan" to annotate.
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
          onLoad={onMapLoad}
        />
      </div>

      <div className="button-container">
        <button className="btn btn-secondary" onClick={getCurrentLocation}>
          Use Current Location
        </button>
        <button className="btn btn-primary" onClick={handleGoToDesignPlan}>
          Go to Design Plan →
        </button>
      </div>
    </div>
  );
};

export default MapView;
