export type AuthChallenge = {
  nonce: string;
  message: string;
  expiresAt: string;
};
export type LiveUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  githubProfile?: string | null;
  experienceLevel?: "beginner" | "intermediate" | "advanced" | "expert" | null;
  learningPath?: string | null;
  stellarAddress: string;
  isVerified: true;
  role: string;
};
export type LiveSession = { token: string; user: LiveUser };
export type SigningWallet = {
  id?: string;
  name?: string;
  getAddress(): Promise<string>;
  sign(
    message: string,
    address: string,
  ): Promise<{ signature: string; address: string }>;
  signTransaction?(
    xdr: string,
    options: { address: string; networkPassphrase: string },
  ): Promise<{ signedTxXdr: string; signerAddress?: string }>;
};
export function parseChallenge(value: unknown): AuthChallenge {
  const data = value as AuthChallenge;
  if (
    !data ||
    typeof data.nonce !== "string" ||
    !data.nonce ||
    typeof data.message !== "string" ||
    !data.message ||
    typeof data.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(data.expiresAt))
  )
    throw new Error(
      "Invalid authentication challenge received. Please reconnect.",
    );
  if (Date.parse(data.expiresAt) <= Date.now())
    throw new Error("Your challenge expired. Please request a new one.");
  return data;
}
export function parseSession(value: unknown, address: string): LiveSession {
  const data = value as LiveSession;
  if (
    !data ||
    typeof data.token !== "string" ||
    !data.token ||
    !data.user ||
    data.user.stellarAddress !== address ||
    data.user.isVerified !== true ||
    !["id", "username", "displayName", "email", "role"].every(
      (key) => typeof data.user[key as keyof LiveUser] === "string",
    )
  )
    throw new Error(
      "The API returned an invalid or mismatched authenticated user. Please reconnect.",
    );
  return data;
}
export async function authenticateWallet({
  address,
  challenge,
  wallet,
  verify,
}: {
  address: string;
  challenge: AuthChallenge;
  wallet: SigningWallet;
  verify(signature: string): Promise<unknown>;
}): Promise<LiveSession> {
  parseChallenge(challenge);
  if ((await wallet.getAddress()) !== address)
    throw new Error("Your wallet account changed. Please reconnect.");
  const signed = await wallet.sign(challenge.message, address);
  if (signed.address !== address || (await wallet.getAddress()) !== address)
    throw new Error("Your wallet account changed. Please reconnect.");
  parseChallenge(challenge);
  if (!signed.signature)
    throw new Error("The wallet did not return a signature. Please try again.");
  return parseSession(await verify(signed.signature), address);
}
