import { PublicClientApplication } from '@azure/msal-browser';

const redirectUri = window.location.hostname === 'localhost'
  ? 'http://localhost:5173'
  : 'https://qm-amber.vercel.app';

const msalConfig = {
  auth: {
    clientId: 'de9491c1-9d14-4a48-a6cf-96d669e90450',
    authority: 'https://login.microsoftonline.com/327bb5ad-7fae-410e-b419-2cb772fe9489',
    redirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest = {
  scopes: ['Files.Read.All'],
};
