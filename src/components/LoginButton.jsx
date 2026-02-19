import { useMsal } from "@azure/msal-react";

export default function LoginButton() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance
      .loginRedirect({
        scopes: ["openid", "profile", "email", "User.Read"],
      })
      .catch(console.error);
  };

  return (
    <button
      onClick={handleLogin}
      style={{ padding: "10px 24px", fontSize: "16px", cursor: "pointer" }}
    >
      Sign in with Microsoft
    </button>
  );
}
