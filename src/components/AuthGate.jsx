import { useEffect, useState } from "react";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from "@azure/msal-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import cartersLogo from "../assets/Carters_Horizontal_transparent.png";
import "./AuthGate.css";

const ALLOWED_DOMAINS = ["@carters.co.nz"];
const ALLOWED_EMAILS = ["eliazzudo@outlook.com", "aaronmurr55@live.com"];

const LOGIN_REQUEST = {
  scopes: ["openid", "profile", "email", "User.Read"],
};

// Microsoft logo SVG (official four-square mark)
function MicrosoftLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 21 21"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function DomainCheck({ children }) {
  const { instance, accounts } = useMsal();
  const [unauthorized, setUnauthorized] = useState(false);
  const account = accounts[0];

  useEffect(() => {
    if (!account) return;
    const email = account.username.toLowerCase();
    const domainAllowed = ALLOWED_DOMAINS.some((domain) =>
      email.endsWith(domain),
    );
    const emailAllowed = ALLOWED_EMAILS.includes(email);
    const isAllowed = domainAllowed || emailAllowed;
    setUnauthorized(!isAllowed);
  }, [account]);

  if (unauthorized) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <img src={cartersLogo} alt="Carter's" className="auth-logo" />
          <div className="auth-divider" />
          <div className="auth-error-icon">⚠️</div>
          <h1>Access Denied</h1>
          <p className="auth-error-text">
            Your account domain is not permitted to access this application.
            Please sign in with an authorised account.
          </p>
          <button
            className="btn-switch-account"
            onClick={() =>
              instance
                .loginRedirect({ ...LOGIN_REQUEST, prompt: "select_account" })
                .catch(console.error)
            }
          >
            Sign in with a different account
          </button>
        </div>
        <p className="auth-footer">HIAB Lift Planner &mdash; Carter's</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

export default function AuthGate({ children }) {
  const { instance } = useMsal();

  return (
    <>
      <AuthenticatedTemplate>
        <DomainCheck>{children}</DomainCheck>
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <div className="auth-page">
          <div className="auth-card">
            <img src={cartersLogo} alt="Carter's" className="auth-logo" />
            <div className="auth-divider" />
            <h1>Auckland Distribution Center Hiab Lift Planner</h1>
            <p>Sign in with your Carter's Microsoft account to continue.</p>
            <button
              className="btn-microsoft"
              onClick={() =>
                instance.loginRedirect(LOGIN_REQUEST).catch(console.error)
              }
            >
              <MicrosoftLogo />
              Sign in with Microsoft
            </button>
          </div>
          <p className="auth-footer">HIAB Lift Planner &mdash; Carter's</p>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
}
