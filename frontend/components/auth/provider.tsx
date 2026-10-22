"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AuthChallenge, LiveSession } from "@/lib/api/auth";
import { getActiveWallet } from "@/lib/api/wallets";
export type PendingAuth = {
  address: string;
  challenge: AuthChallenge;
  walletId?: string;
  username?: string;
  email?: string;
  displayName?: string;
  githubProfile?: string;
  experienceLevel?: string;
  learningPath?: string;
};
type AuthContext = {
  ready: boolean;
  session: LiveSession | null;
  pending: PendingAuth | null;
  begin(value: PendingAuth): void;
  login(value: LiveSession): void;
  updateUser(user: Partial<LiveSession["user"]>): void;
  clear(): void;
};
const Context = createContext<AuthContext | null>(null);
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function LiveAuthProvider({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [pending, setPending] = useState<PendingAuth | null>(null);
  const generation = useRef(0);
  const clear = useCallback(() => {
    generation.current++;
    setSession(null);
    setPending(null);
  }, []);
  useEffect(() => {
    if (!session) return;
    let stopped = false;
    let checking = false;
    const current = ++generation.current;
    async function check() {
      if (checking || document.visibilityState === "hidden") return;
      checking = true;
      try {
        const address = await getActiveWallet().getAddress();
        if (
          !stopped &&
          generation.current === current &&
          address !== session!.user.stellarAddress
        )
          clear();
      } catch {
        if (!stopped && generation.current === current) clear();
      } finally {
        checking = false;
      }
    }
    const timer = setInterval(check, 10000);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [session, clear]);
  return (
    <Context.Provider
      value={{
        ready,
        session,
        pending,
        begin(value) {
          generation.current++;
          setSession(null);
          setPending(value);
        },
        login(value) {
          generation.current++;
          setPending(null);
          setSession(value);
        },
        updateUser(updated) {
          setSession((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              user: {
                ...prev.user,
                ...updated,
              },
            };
          });
        },
        clear,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLiveAuth() {
  const value = useContext(Context);
  if (!value) throw Error("LiveAuthProvider required");
  return value;
}
