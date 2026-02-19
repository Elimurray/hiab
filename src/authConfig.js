export const msalConfig = {
  auth: {
    clientId: "2938ea9f-9799-425b-ae4a-f8e5aef91c7f",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "http://localhost:5173",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};
