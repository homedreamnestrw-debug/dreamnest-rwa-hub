import { Link } from "react-router-dom";
import { ShoppingCart, Heart, User, Menu, X, Search } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";

export function Header() {
  const { user, isAdmin, isStaff, signOut } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20 lg:h-24">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="DreamNest" className="h-20 lg:h-24 w-auto -my-4" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Home</Link>
            <Link to="/shop" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Shop</Link>
            <Link to="/about" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Contact</Link>
            <Link to="/gift-vouchers" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">Gift Vouchers</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="h-5 w-5" />
            </Button>
            {user && (
              <Link to="/wishlist">
                <Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button>
              </Link>
            )}
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {itemCount > 9 ? "9+" : itemCount}
                </Badge>
              )}
            </Link>
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                {(isAdmin || isStaff) && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm">Dashboard</Button>
                  </Link>
                )}
                <Link to="/account">
                  <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
                </Link>
              </div>
            ) : (
              <Link to="/auth/login" className="hidden md:block">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t py-4 space-y-3">
            <Link to="/" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link to="/shop" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Shop</Link>
            <Link to="/about" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>About</Link>
            <Link to="/contact" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Contact</Link>
            <Link to="/gift-vouchers" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Gift Vouchers</Link>
            {user ? (
              <>
                <Link to="/account" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>My Account</Link>
                {(isAdmin || isStaff) && <Link to="/admin" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Dashboard</Link>}
                <button className="block py-2 text-sm font-medium text-destructive" onClick={() => { signOut(); setMobileOpen(false); }}>Sign Out</button>
              </>
            ) : (
              <Link to="/auth/login" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Sign In</Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
