import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { useDelivery } from "../context/DeliveryContext";
import html2canvas from "html2canvas";
import "./MapView.css";

const MapView = () => {
  const navigate = useNavigate();
  const {
    mapCenter,
    updateMapCenter,
    updateMapScreenshot,
    formData,
    updateFormData,
  } = useDelivery();

  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const getCurrentLocationRef = useRef(null);
  const locationButtonAddedRef = useRef(false);

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
    mapTypeControl: false,
    fullscreenControl: true,
    fullscreenControlOptions: {
      position: window.google.maps.ControlPosition.BOTTOM_RIGHT,
    },
    gestureHandling: "greedy",
  };

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLocation = { lat: latitude, lng: longitude };
          updateMapCenter(latitude, longitude);
          if (mapRef.current) {
            mapRef.current.panTo(currentLocation);
          }
          setError(null);
        },
        (err) => {
          setError(
            err.message || "Unable to retrieve location. Please try again.",
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  }, [updateMapCenter]);

  // Keep ref in sync so onMapLoad closure always calls the latest version
  getCurrentLocationRef.current = getCurrentLocation;

  // Store map instance and add custom location control button
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (locationButtonAddedRef.current) return;
    locationButtonAddedRef.current = true;

    // Create a Google Maps-style "My Location" button
    const locationButton = document.createElement("button");
    locationButton.title = "My Location";
    locationButton.type = "button";
    locationButton.style.cssText = `
      background: white;
      border: none;
      border-radius: 2px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      cursor: pointer;
      margin: 10px;
      padding: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
    `;

    // Crosshair / target SVG matching Google Maps style
    locationButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" fill="#1a73e8"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#1a73e8" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    locationButton.addEventListener("click", () => {
      getCurrentLocationRef.current();
    });
    locationButton.addEventListener("mouseenter", () => {
      locationButton.style.background = "#f8f9fa";
    });
    locationButton.addEventListener("mouseleave", () => {
      locationButton.style.background = "white";
    });

    map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(
      locationButton,
    );
  }, []); // empty deps — runs only once when map first mounts

  // Fetch current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body bounce on the map page — the map handles its own touch events
  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overscrollBehavior = "";
    };
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        updateMapCenter(lat, lng);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(18);
        }
        // Save the searched address into the form context
        if (place.formatted_address) {
          updateFormData({
            ...formData,
            clientAddress: place.formatted_address,
          });
        }
      }
    }
  }, [updateMapCenter, updateFormData, formData]);

  // Capture map screenshot and navigate to design plan
  const handleGoToDesignPlan = async () => {
    if (mapRef.current) {
      try {
        const mapElement = document.querySelector(".google-map-container");

        if (mapElement) {
          const googleControls = mapElement.querySelectorAll(
            ".gmnoprint, .gm-style-cc, .gm-style button, .gm-fullscreen-control",
          );
          googleControls.forEach((el) =>
            el.setAttribute("data-html2canvas-ignore", "true"),
          );

          const canvas = await html2canvas(mapElement, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            scale: 2,
          });

          googleControls.forEach((el) =>
            el.removeAttribute("data-html2canvas-ignore"),
          );

          const screenshot = canvas.toDataURL("image/png");
          updateMapScreenshot(screenshot);

          const center = mapRef.current.getCenter();
          updateMapCenter(center.lat(), center.lng());

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
        <h1>Hiab Lift Planner</h1>
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
        <div className="map-search-overlay">
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              placeholder="Search for a location..."
              className="map-search-input"
            />
          </Autocomplete>
        </div>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          mapContainerClassName="google-map-container"
          center={mapCenter}
          zoom={18}
          options={mapOptions}
          onLoad={onMapLoad}
        />
      </div>

      <div className="button-container">
        <button className="btn btn-primary" onClick={handleGoToDesignPlan}>
          Go to Design Plan →
        </button>
      </div>
    </div>
  );
};

export default MapView;
