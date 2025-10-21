import { createContext, useContext, useState, useMemo } from "react";

const DeliveryContext = createContext();

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error("useDelivery must be used within DeliveryProvider");
  }
  return context;
};

export const DeliveryProvider = ({ children }) => {
  // Store map screenshot (base64)
  const [mapScreenshot, setMapScreenshot] = useState(null);

  // Store design plan annotations
  const [designPlan, setDesignPlan] = useState({
    truck: null, // { x, y }
    cones: [], // [{ id, x, y }]
    lines: [], // [{ id, points: [{ x, y }], color }]
    dropZones: [], // [{ id, number, x, y }]
    loadArrow: null, // { x, y, rotation }
    driver: null, // { x, y }
    windArrow: null, // { x, y, rotation }
  });

  // Store map center
  const [mapCenter, setMapCenter] = useState({
    lat: -37.787,
    lng: 175.2793,
  });

  // Store form data
  const [formData, setFormData] = useState({
    driverName: "",
    clientName: "",
    clientAddress: "",
    date: new Date().toISOString().split("T")[0],
    loadDescription: "",
    weight: "",
    accessNotes: "",
    specialInstructions: "",
  });

  // Update map screenshot
  const updateMapScreenshot = (screenshot) => {
    setMapScreenshot(screenshot);
  };

  // Update design plan
  const updateDesignPlan = (newPlan) => {
    setDesignPlan((prev) => ({ ...prev, ...newPlan }));
  };

  // Update map center
  const updateMapCenter = (lat, lng) => {
    setMapCenter({ lat, lng });
  };

  // Update form data
  const updateFormData = (data) => {
    setFormData(data);
  };

  // Reset all data
  const resetAll = () => {
    setMapScreenshot(null);
    setDesignPlan({
      truck: null,
      cones: [],
      lines: [],
      dropZones: [],
      loadArrow: null,
      driver: null,
      windArrow: null,
    });
    setMapCenter({ lat: -37.787, lng: 175.2793 });
    setFormData({
      driverName: "",
      clientName: "",
      clientAddress: "",
      date: new Date().toISOString().split("T")[0],
      loadDescription: "",
      weight: "",
      accessNotes: "",
      specialInstructions: "",
    });
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      mapScreenshot,
      designPlan,
      mapCenter,
      formData,
      updateMapScreenshot,
      updateDesignPlan,
      updateMapCenter,
      updateFormData,
      resetAll,
    }),
    [mapScreenshot, designPlan, mapCenter, formData]
  );

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};
