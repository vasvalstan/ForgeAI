import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
