import { registerPlugin } from "@capacitor/core";

export interface GoogleAuthUser {
  id?: string;
  email?: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  imageUrl?: string;
  idToken?: string;
  serverAuthCode?: string;
  authentication?: {
    idToken: string;
    accessToken?: string;
  };
}

export interface GoogleAuthPlugin {
  initialize(options?: {
    clientId?: string;
    serverClientId?: string;
    scopes?: string[];
    grantOfflineAccess?: boolean;
    forceCodeForRefreshToken?: boolean;
  }): Promise<void>;
  signIn(options?: {
    serverClientId?: string;
    scopes?: string[];
  }): Promise<GoogleAuthUser>;
  signOut(): Promise<void>;
  refresh(): Promise<{ idToken: string }>;
}

export const NativeGoogleAuth = registerPlugin<GoogleAuthPlugin>("GoogleAuth", {
  web: () => ({
    initialize: async () => {},
    signIn: async () => {
      throw new Error("Native GoogleAuth is only available on native platforms.");
    },
    signOut: async () => {},
    refresh: async () => {
      throw new Error("Native GoogleAuth is only available on native platforms.");
    },
  }),
});
