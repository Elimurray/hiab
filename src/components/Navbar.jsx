import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import cartersLogo from "../assets/Carters_Horizontal_transparent.png";
import "./Navbar.css";

export default function Navbar() {
  const { instance, accounts } = useMsal();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const userName = accounts[0]?.name || accounts[0]?.username || "";

  const handleSignOut = () => {
    instance.logoutRedirect().catch(console.error);
  };

  return (
    <>
      <nav className="navbar">
        <img src={cartersLogo} alt="Carter's" className="navbar-logo" />

        {/* Desktop: name + sign out */}
        <div className="navbar-user desktop-only">
          {userName && <span className="navbar-username">{userName}</span>}
          <button className="navbar-signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

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
        {userName && <span className="drawer-username">{userName}</span>}
        <button className="drawer-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </>
  );
}
