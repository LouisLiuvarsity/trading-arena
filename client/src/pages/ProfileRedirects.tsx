import { useEffect } from "react";
import { useLocation } from "wouter";

/** Redirect /profile/edit → /profile?tab=settings */
export function ProfileEditRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/profile?tab=settings", { replace: true }); }, [navigate]);
  return null;
}

/** Redirect /profile/analytics → /profile?tab=analytics */
export function ProfileAnalyticsRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/profile?tab=analytics", { replace: true }); }, [navigate]);
  return null;
}

/** Redirect /history → /profile?tab=history */
export function MatchHistoryRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/profile?tab=history", { replace: true }); }, [navigate]);
  return null;
}
