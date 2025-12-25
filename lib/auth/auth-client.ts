import { createAuthClient } from "better-auth/react";
// type for auth client if incase not properly configured.
type BAClient = ReturnType<typeof createAuthClient>;
export const authClient = createAuthClient({
  baseURL: "https://thahryywpiigweqfxmgkq2uc3a.srv.us",
  fetchOptions: {
    credentials: "include",
  },
});

const { useSession, signOut } = authClient;
export { useSession, signOut };