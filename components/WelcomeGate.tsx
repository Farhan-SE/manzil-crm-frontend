"use client";

import { useEffect, useState } from "react";
import { WelcomeModal } from "@/components/WelcomeModal";
import { getSessionUser } from "@/lib/api";

// The JWT still says password_changed:false until the next login, so the completed
// flow is remembered here for the rest of the tab's session.
const DISMISS_KEY = "welcome_done";

export function WelcomeGate() {
  const [show, setShow] = useState(false);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const user = getSessionUser();
    if (!user || user.password_changed) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // Private mode can throw on storage access — show the flow rather than skip it.
    }
    setFirstName(user.first_name);
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <WelcomeModal
      firstName={firstName}
      onDone={() => {
        try {
          sessionStorage.setItem(DISMISS_KEY, "1");
        } catch {}
        setShow(false);
      }}
    />
  );
}
