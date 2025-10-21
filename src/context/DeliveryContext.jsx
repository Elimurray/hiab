import { createContext, useContext, useState } from "react";

const DeliveryContext = createContext();

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error("useDelivery must be used within DeliveryProvider");
  }
  return context;
};

export const DeliveryProvider = ({ children }) => {
  // Store markers
  const [markers, setMarkers] = useState({
    truck: null,
    drop: null,
  });

  // Store map center - ADD THIS
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

  // Update markers
  const updateMarkers = (truck, drop) => {
    setMarkers({ truck, drop });
  };

  // Update map center - ADD THIS
  const updateMapCenter = (lat, lng) => {
    setMapCenter({ lat, lng });
  };

  // Update form data
  const updateFormData = (data) => {
    setFormData(data);
  };

  // Reset all data
  const resetAll = () => {
    setMarkers({ truck: null, drop: null });
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

  const value = {
    markers,
    mapCenter, // ADD THIS
    formData,
    updateMarkers,
    updateMapCenter, // ADD THIS
    updateFormData,
    resetAll,
  };

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
};
