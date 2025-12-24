import { authClient } from "./auth-client";

export const googleSignin = async (callbackURL: string = "/home") => {
  await authClient.signIn.social({
    provider: "google",
    callbackURL,
  });
};

 