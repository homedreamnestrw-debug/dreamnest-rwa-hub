import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Contact() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const { error } = await supabase.from("contact_submissions").insert({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || null,
      subject: (formData.get("subject") as string) || null,
      message: formData.get("message") as string,
    });
    if (error) toast.error("Failed to send message. Please try again.");
    else {
      toast.success("Message sent! We'll get back to you soon.");
      form.reset();
    }
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-serif mb-3">Get in Touch</h1>
          <p className="text-muted-foreground max-w-md mx-auto">We'd love to hear from you. Reach out with any questions about our products or orders.</p>
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
                <Input id="phone" name="phone" />
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
                <h3 className="font-serif text-lg mb-1">Visit Us</h3>
                <p className="text-muted-foreground text-sm">KG 123 Street<br />Kigali, Rwanda</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Phone className="h-6 w-6 text-soft-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-serif text-lg mb-1">Call Us</h3>
                <p className="text-muted-foreground text-sm">+250 788 000 000</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Mail className="h-6 w-6 text-soft-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-serif text-lg mb-1">Email Us</h3>
                <p className="text-muted-foreground text-sm">sales@dreamnestrw.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
