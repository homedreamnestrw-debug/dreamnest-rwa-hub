import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisitShopActions, VisitShopBody, useVisitShopInfo } from "@/components/VisitShopContent";

const STORAGE_KEY = "dreamnest-welcome-popup";
const SHOW_DELAY_MS = 3000;
const DISMISS_FOR_DAYS = 7;

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { address, mapsUrl, instagramUrl } = useVisitShopInfo();


  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { dismissedAt } = JSON.parse(stored) as { dismissedAt?: number };
        const ttl = DISMISS_FOR_DAYS * 24 * 60 * 60 * 1000;
        if (dismissedAt && Date.now() - dismissedAt < ttl) return;
      } catch {
        // Ignore invalid JSON and continue to show the popup.
      }
    }

    const timer = window.setTimeout(() => {
      setIsOpen(true);
      // Allow a paint frame so the enter transition can run.
      requestAnimationFrame(() => setIsVisible(true));
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(() => {
      setIsOpen(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    }, 300);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 safe-x">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={close}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-popup-title"
        className={cn(
          "relative w-full max-w-md sm:max-w-lg bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-6 sm:p-8 transition-all duration-300 ease-out",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        )}
      >
        <button
          onClick={close}
          className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tap-target"
          aria-label="Close welcome popup"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-4">
          <h2
            id="welcome-popup-title"
            className="font-serif text-2xl sm:text-3xl font-bold text-foreground leading-tight pr-8"
          >
            Visit our shop today!
          </h2>

          <VisitShopBody address={address} />
        </div>

        <VisitShopActions mapsUrl={mapsUrl} instagramUrl={instagramUrl} onAction={close} />

      </div>
    </div>
  );
}
