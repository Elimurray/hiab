import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import cartersLogo from "../assets/Carters_Horizontal_transparent.png";
import "./Navbar.css";

export default function Navbar() {
  const { instance } = useMsal();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = () => {
    instance.logoutRedirect().catch(console.error);
  };

  return (
    <>
      <nav className="navbar">
        <img src={cartersLogo} alt="Carter's" className="navbar-logo" />

        {/* Desktop sign out */}
        <button className="navbar-signout desktop-only" onClick={handleSignOut}>
          Sign out
        </button>

        {/* Mobile burger */}
        <button
          className="burger mobile-only"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Side drawer */}
      <div className={`drawer ${drawerOpen ? "drawer-open" : ""}`}>
        <button
          className="drawer-close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>
        <button className="drawer-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </>
  );
}
