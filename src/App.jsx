import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoadScript } from "@react-google-maps/api";
import { DeliveryProvider } from "./context/DeliveryContext";
import MapView from "./components/MapView";
import DesignPlan from "./components/DesignPlan";
import DeliveryForm from "./components/DeliveryForm";
import ReviewPage from "./components/ReviewPage";
import "./App.css";

function App() {
  return (
    <DeliveryProvider>
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        loadingElement={<div>Loading Maps...</div>}
      >
        <BrowserRouter>
          <div className="App">
            <Routes>
              <Route path="/" element={<MapView />} />
              <Route path="/design-plan" element={<DesignPlan />} />
              <Route path="/form" element={<DeliveryForm />} />
              <Route path="/review" element={<ReviewPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </LoadScript>
    </DeliveryProvider>
  );
}

export default App;
