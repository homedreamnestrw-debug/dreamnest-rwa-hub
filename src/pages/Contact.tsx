import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

export default function Contact() {
  const [loading, setLoading] = useState(false);
  const { content: c } = useWebsiteContent();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = (formData.get("phone") as string) || null;
    const subject = (formData.get("subject") as string) || null;
    const message = formData.get("message") as string;

    const { error } = await supabase.from("contact_submissions").insert({
      name, email, phone, subject, message,
    });

    if (error) {
      toast.error("Failed to send message. Please try again.");
    } else {
      toast.success("Message sent! We'll get back to you soon.");
      form.reset();

      // Email notifications are handled server-side for contact submissions
      // The contact submission is saved to the database and visible in admin dashboard
    }
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-serif mb-3">
            {c.contact_title ?? "Get in Touch"}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {c.contact_description ?? "We'd love to hear from you. Reach out with any questions about our products or orders."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-5xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+250 7XX XXX XXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" name="message" rows={5} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>

          <div className="space-y-8">
            <div className="flex gap-4">
              <MapPin className="h-6 w-6 text-soft-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-serif text-lg mb-1">{c.contact_label_visit ?? "Visit Us"}</h3>
                <p className="text-muted-foreground text-sm">
                  {c.contact_address ?? "KG 123 Street, Kigali, Rwanda"}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Phone className="h-6 w-6 text-soft-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-serif text-lg mb-1">{c.contact_label_call ?? "Call Us"}</h3>
                <p className="text-muted-foreground text-sm">
                  {c.contact_phone ?? "+250 788 000 000"}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Mail className="h-6 w-6 text-soft-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-serif text-lg mb-1">{c.contact_label_email ?? "Email Us"}</h3>
                <p className="text-muted-foreground text-sm">
                  {c.contact_email ?? "sales@dreamnestrw.com"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl lg:text-3xl font-serif mb-2">Find Us on the Map</h2>
            <p className="text-muted-foreground text-sm">
              {c.contact_address ?? "31 KG 1 Ave, Kigali, Rwanda"}
            </p>
          </div>
          <div className="rounded-lg overflow-hidden shadow-lg border border-border aspect-[16/9]">
            <iframe
              title="DreamNest Location"
              src="https://www.google.com/maps?q=31+KG+1+Ave,+Kigali,+Rwanda&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <div className="text-center mt-4">
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=31+KG+1+Ave,+Kigali,+Rwanda"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-soft-gold hover:underline text-sm font-medium"
            >
              <MapPin className="h-4 w-4" />
              Get Directions
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
