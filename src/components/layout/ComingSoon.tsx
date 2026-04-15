import { PublicLayout } from "./PublicLayout";
import { Gift, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function ComingSoon() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20 text-center">
        <Clock className="h-16 w-16 text-soft-gold mx-auto mb-6" />
        <h1 className="text-4xl lg:text-5xl font-serif mb-4">We're Launching Soon</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
          Our online shop is being prepared with care. Stay tuned for premium bedding and home decor.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/contact">
            <Button variant="outline" size="lg">Contact Us</Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="lg">Back Home</Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
