import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";
import { DeliveryProvider } from "./context/DeliveryContext";
import "./index.css";
import App from "./App.jsx";
import AuthGate from "./components/AuthGate.jsx";

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise().then(() => {
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <BrowserRouter>
            <DeliveryProvider>
              <AuthGate>
                <App />
              </AuthGate>
            </DeliveryProvider>
          </BrowserRouter>
        </MsalProvider>
      </StrictMode>,
    );
  });
});
