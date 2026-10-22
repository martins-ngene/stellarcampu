export const WELCOME_STORAGE_KEY = "stellarcampus.welcome.v1";
export function shouldShowWelcome(saved: string | null): boolean {
  return saved !== "complete";
}
