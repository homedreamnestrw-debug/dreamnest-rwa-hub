import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { X, MapPin, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dreamnest-welcome-popup";
const SHOW_DELAY_MS = 3000;
const DISMISS_FOR_DAYS = 7;

const SHOP_ADDRESS = "31 KG 1 Ave, Kigali, Rwanda";
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP_ADDRESS)}`;

export function WelcomePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

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

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Our full online store is launching soon. In the meantime, you can visit us in person at{" "}
            <span className="font-medium text-foreground">{SHOP_ADDRESS}</span> or buy digital gift vouchers online.
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button asChild className="w-full h-11" onClick={close}>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin className="h-4 w-4" />
              Get Store Directions
            </a>
          </Button>

          <Button asChild variant="outline" className="w-full h-11" onClick={close}>
            <Link to="/gift-vouchers">
              <Gift className="h-4 w-4" />
              Buy a Gift Voucher
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
