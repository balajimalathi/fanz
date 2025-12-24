import { authClient } from "./auth-client";

export const googleSignin = async () => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: "/home",
  });
};

 