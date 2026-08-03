import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Download, Share, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import icon from "/icons/icon-192x192.png";

const DISMISS_KEY = "dreamnest_install_dismissed_at";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const webkit = /WebKit/.test(ua);
  const notOtherBrowser = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOtherBrowser;
}

function recentlyDismissed() {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function InstallPrompt() {
  const location = useLocation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  const suppressed = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    let timer: number | undefined;
    if (isIosSafari()) {
      timer = window.setTimeout(() => {
        setIosMode(true);
        setVisible(true);
      }, 5000);
    }

    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!visible || suppressed) return null;

  return (
    <div
      role="dialog"
      aria-label="Install DreamNest app"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] animate-in slide-in-from-bottom duration-300"
    >
      <div className="mx-auto max-w-md rounded-2xl border bg-card text-card-foreground shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <img
            src={icon}
            alt="DreamNest app icon"
            className="h-12 w-12 rounded-xl shrink-0 border"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold leading-tight">Install DreamNest</h3>
            {iosMode ? (
              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-1">
                Tap
                <Share className="h-4 w-4 inline text-primary" aria-hidden="true" />
                <span className="font-medium text-foreground">Share</span>, then
                <Plus className="h-4 w-4 inline text-primary" aria-hidden="true" />
                <span className="font-medium text-foreground">Add to Home Screen</span>.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Add it to your home screen for faster shopping.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="text-muted-foreground hover:text-foreground p-1 -m-1 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          {!iosMode && (
            <Button onClick={install} className="flex-1" size="sm">
              <Download className="h-4 w-4 mr-1.5" />
              Install
            </Button>
          )}
          <Button onClick={dismiss} variant="ghost" size="sm" className={iosMode ? "w-full" : ""}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
