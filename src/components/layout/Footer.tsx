import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useAuth } from "@/contexts/AuthContext";

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
              {c.footer_description ?? "Premium bedding & home decor, crafted with care in Kigali, Rwanda."}
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
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 text-center text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} DreamNest. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
