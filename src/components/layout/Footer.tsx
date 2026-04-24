import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import logo from "@/assets/logo.png";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useAuth } from "@/contexts/AuthContext";

// TikTok icon (not in lucide) — simple inline SVG
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.45a8.16 8.16 0 0 0 4.77 1.52V6.55a4.85 4.85 0 0 1-1.84-.14z"/>
  </svg>
);

export function Footer() {
  const { content: c } = useWebsiteContent();
  const { user } = useAuth();
  const accountHref = user ? "/account" : "/auth/login";

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <img src={logo} alt="DreamNest" className="h-14 w-auto brightness-0 invert" />
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              {c.footer_description ?? "Premium bedding, bedroom sets, pillows, storage boxes and home decor — crafted with care in Kigali, Rwanda."}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/70">
              <Link to="/shop" className="hover:text-primary-foreground transition-colors">Shop All</Link>
              <Link to="/about" className="hover:text-primary-foreground transition-colors">About Us</Link>
              <Link to="/contact" className="hover:text-primary-foreground transition-colors">Contact</Link>
            </div>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg">Customer Care</h4>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/70">
              <Link to={accountHref} className="hover:text-primary-foreground transition-colors">My Account</Link>
              <Link to={accountHref} className="hover:text-primary-foreground transition-colors">Track Orders</Link>
              <span>Returns & Exchanges</span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-serif text-lg">Get in Touch</h4>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/70">
              <span>{c.contact_address ?? "KG 123 Street, Kigali"}</span>
              <span>{c.contact_phone ?? "+250 788 000 000"}</span>
              <span>{c.contact_email ?? "sales@dreamnestrw.com"}</span>
            </div>
            {(c.social_instagram || c.social_tiktok || c.social_facebook) && (
              <div className="flex items-center gap-3 pt-2">
                {c.social_instagram && (
                  <a
                    href={c.social_instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {c.social_tiktok && (
                  <a
                    href={c.social_tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    <TikTokIcon className="h-5 w-5" />
                  </a>
                )}
                {c.social_facebook && (
                  <a
                    href={c.social_facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-primary-foreground/50">
          <span>© {new Date().getFullYear()} DreamNest. All rights reserved.</span>
          <span className="hidden sm:inline">·</span>
          <Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms & Conditions</Link>
        </div>
      </div>
    </footer>
  );
}
