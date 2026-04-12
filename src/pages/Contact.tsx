import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const { data: biz } = useQuery({
    queryKey: ["business-settings-public"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_business_settings");
      return data?.[0] ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

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

      // Notify admin
      supabase.functions.invoke("notify-customer", {
        body: {
          to: "sales@dreamnestrw.com",
          subject: `New Contact: ${subject || "No Subject"} — from ${name}`,
          html: `<p><strong>From:</strong> ${name} (${email}${phone ? `, ${phone}` : ""})</p>
                 <p><strong>Subject:</strong> ${subject || "N/A"}</p>
                 <hr/>
                 <p>${message.replace(/\n/g, "<br/>")}</p>`,
        },
      });

      // Confirmation to customer
      supabase.functions.invoke("notify-customer", {
        body: {
          to: email,
          subject: "We received your message — DreamNest",
          html: `<p>Hi ${name},</p>
                 <p>Thank you for reaching out to DreamNest! We've received your message and will get back to you as soon as possible.</p>
                 <p>Best regards,<br/>The DreamNest Team</p>`,
        },
      });
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
