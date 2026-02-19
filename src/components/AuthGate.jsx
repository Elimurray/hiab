import { useEffect, useState } from "react";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from "@azure/msal-react";
import LoginButton from "./LoginButton";
import Navbar from "./Navbar";

const ALLOWED_DOMAIN = "@outlook.com";

function DomainCheck({ children }) {
  const { instance, accounts } = useMsal();
  const [unauthorized, setUnauthorized] = useState(false);
  const account = accounts[0];

  useEffect(() => {
    if (!account) return;
    const email = account.username ?? "";
    setUnauthorized(!email.toLowerCase().endsWith(ALLOWED_DOMAIN));
  }, [account]);

  if (unauthorized) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: "12px",
        }}
      >
        <p style={{ fontSize: "18px" }}>
          Unauthorized: your account domain is not permitted to access this
          application.
        </p>
        <button
          onClick={() =>
            instance
              .loginRedirect({
                scopes: ["openid", "profile", "email", "User.Read"],
                prompt: "select_account",
              })
              .catch(console.error)
          }
          style={{ padding: "8px 20px", cursor: "pointer" }}
        >
          Sign in with a different account
        </button>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function AuthGate({ children }) {
  return (
    <>
      <AuthenticatedTemplate>
        <DomainCheck>{children}</DomainCheck>
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <LoginButton />
        </div>
      </UnauthenticatedTemplate>
    </>
  );
}
