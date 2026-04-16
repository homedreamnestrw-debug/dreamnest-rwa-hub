import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Save, Building2, CreditCard, Mail, Heart, FileText, Upload, Loader2, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type BusinessSettings = Tables<"business_settings">;

export default function Settings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Website content state
  const [websiteContent, setWebsiteContent] = useState<Record<string, string>>({});
  const [savingContent, setSavingContent] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    tagline: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    address: "",
    city: "",
    country: "",
    currency: "RWF",
    vat_percentage: 18,
    logo_url: "",
    loyalty_points_rate: 1,
    loyalty_redemption_rate: 0.5,
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    receipt_header: "",
    receipt_footer: "",
    receipt_logo_url: "",
    shop_enabled: true,
  });

  const fetchSettings = async () => {
    const { data } = await supabase.from("business_settings").select("*").limit(1).single();
    if (data) {
      setSettings(data);
      setForm({
        business_name: data.business_name,
        tagline: data.tagline || "",
        email: data.email || "",
        phone: data.phone || "",
        whatsapp_number: data.whatsapp_number || "",
        address: data.address || "",
        city: data.city || "",
        country: data.country || "",
        currency: data.currency,
        vat_percentage: Number(data.vat_percentage),
        logo_url: data.logo_url || "",
        loyalty_points_rate: Number(data.loyalty_points_rate),
        loyalty_redemption_rate: Number(data.loyalty_redemption_rate),
        smtp_host: data.smtp_host || "",
        smtp_port: data.smtp_port || 587,
        smtp_user: data.smtp_user || "",
        receipt_header: (data as any).receipt_header || "",
        receipt_footer: (data as any).receipt_footer || "",
        receipt_logo_url: (data as any).receipt_logo_url || "",
        shop_enabled: (data as any).shop_enabled ?? true,
      });
    }
    setLoading(false);
  };

  const fetchWebsiteContent = async () => {
    const { data } = await supabase.from("website_content").select("content_key, content_value");
    if (data) {
      const map: Record<string, string> = {};
      for (const row of data) {
        map[row.content_key] = row.content_value;
      }
      setWebsiteContent(map);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWebsiteContent();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("business_settings").update({
      business_name: form.business_name,
      tagline: form.tagline || null,
      email: form.email || null,
      phone: form.phone || null,
      whatsapp_number: form.whatsapp_number || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      currency: form.currency,
      vat_percentage: form.vat_percentage,
      logo_url: form.logo_url || null,
      loyalty_points_rate: form.loyalty_points_rate,
      loyalty_redemption_rate: form.loyalty_redemption_rate,
      smtp_host: form.smtp_host || null,
      smtp_port: form.smtp_port || null,
      smtp_user: form.smtp_user || null,
      receipt_header: form.receipt_header || null,
      receipt_footer: form.receipt_footer || null,
      receipt_logo_url: form.receipt_logo_url || null,
      shop_enabled: form.shop_enabled,
    } as any).eq("id", settings.id);

    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Settings saved" });
    fetchSettings();
  };

  const handleSaveContent = async () => {
    setSavingContent(true);
    const promises = Object.entries(websiteContent).map(([key, value]) =>
      supabase.from("website_content").upsert(
        { content_key: key, content_value: value },
        { onConflict: "content_key" }
      )
    );
    const results = await Promise.all(promises);
    const failed = results.find((r) => r.error);
    setSavingContent(false);
    if (failed?.error) {
      toast({ title: "Error", description: failed.error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Website content saved" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading settings...</div>;
  }

  const f = (key: keyof typeof form, value: string | number) => setForm({ ...form, [key]: value });
  const wc = (key: string, value: string) => setWebsiteContent((prev) => ({ ...prev, [key]: value }));

  const contentField = (key: string, label: string, multiline = false) => (
    <div key={key}>
      <Label>{label}</Label>
      {multiline ? (
        <Textarea value={websiteContent[key] || ""} onChange={(e) => wc(key, e.target.value)} className="h-20" />
      ) : (
        <Input value={websiteContent[key] || ""} onChange={(e) => wc(key, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="flex-wrap">
          <TabsTrigger value="business"><Building2 className="h-4 w-4 mr-1" /> Business</TabsTrigger>
          <TabsTrigger value="finance"><CreditCard className="h-4 w-4 mr-1" /> Finance</TabsTrigger>
          <TabsTrigger value="loyalty"><Heart className="h-4 w-4 mr-1" /> Loyalty</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1" /> Email</TabsTrigger>
          <TabsTrigger value="receipt"><FileText className="h-4 w-4 mr-1" /> Receipt</TabsTrigger>
          <TabsTrigger value="website"><Globe className="h-4 w-4 mr-1" /> Website</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Your business name, contact details, and branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Business Name</Label><Input value={form.business_name} onChange={(e) => f("business_name", e.target.value)} /></div>
                <div><Label>Tagline</Label><Input value={form.tagline} onChange={(e) => f("tagline", e.target.value)} /></div>
              </div>
              <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => f("logo_url", e.target.value)} placeholder="https://..." /></div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => f("email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => f("phone", e.target.value)} /></div>
              </div>
              <div><Label>WhatsApp Number</Label><Input value={form.whatsapp_number} onChange={(e) => f("whatsapp_number", e.target.value)} /></div>
              <Separator />
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => f("address", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={form.city} onChange={(e) => f("city", e.target.value)} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={(e) => f("country", e.target.value)} /></div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Online Shopping</Label>
                  <p className="text-sm text-muted-foreground">Turn off to show a Coming Soon page to visitors</p>
                </div>
                <Switch checked={form.shop_enabled} onCheckedChange={(v) => setForm({ ...form, shop_enabled: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>Currency and tax configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => f("currency", e.target.value)} /></div>
                <div><Label>VAT Percentage (%)</Label><Input type="number" value={form.vat_percentage} onChange={(e) => f("vat_percentage", +e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Program</CardTitle>
              <CardDescription>Configure how customers earn and redeem points.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Points Rate</Label>
                  <Input type="number" step="0.01" value={form.loyalty_points_rate} onChange={(e) => f("loyalty_points_rate", +e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Points earned per 1 RWF spent</p>
                </div>
                <div>
                  <Label>Redemption Rate</Label>
                  <Input type="number" step="0.01" value={form.loyalty_redemption_rate} onChange={(e) => f("loyalty_redemption_rate", +e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">RWF value per 1 point redeemed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>SMTP settings for transactional emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>SMTP Host</Label><Input value={form.smtp_host} onChange={(e) => f("smtp_host", e.target.value)} placeholder="smtp.example.com" /></div>
                <div><Label>SMTP Port</Label><Input type="number" value={form.smtp_port} onChange={(e) => f("smtp_port", +e.target.value)} /></div>
              </div>
              <div><Label>SMTP User</Label><Input value={form.smtp_user} onChange={(e) => f("smtp_user", e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Receipt & Invoice Customization</CardTitle>
              <CardDescription>Set the logo, header text, and footer text that appear on receipts and invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Receipt / Invoice Logo</Label>
                <div className="flex gap-2 items-end">
                  <Input value={form.receipt_logo_url} onChange={(e) => f("receipt_logo_url", e.target.value)} placeholder="https://... (leave empty to use main logo)" className="flex-1" />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-md cursor-pointer hover:bg-muted transition-colors">
                    {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                    <input type="file" accept="image/*" className="hidden" disabled={logoUploading} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setLogoUploading(true);
                      const ext = file.name.split(".").pop();
                      const path = `receipt-logo-${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from("business-assets").upload(path, file);
                      if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setLogoUploading(false); return; }
                      const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
                      f("receipt_logo_url", data.publicUrl);
                      setLogoUploading(false);
                      e.target.value = "";
                    }} />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">If empty, the main business logo will be used.</p>
              </div>
              {(form.receipt_logo_url || form.logo_url) && (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  <img src={form.receipt_logo_url || form.logo_url} alt="Receipt Logo Preview" className="h-16 object-contain" />
                  <span className="text-xs text-muted-foreground">Logo preview</span>
                </div>
              )}
              <Separator />
              <div>
                <Label>Header Text</Label>
                <Textarea
                  value={form.receipt_header}
                  onChange={(e) => f("receipt_header", e.target.value)}
                  placeholder="e.g. Thank you for shopping with us!"
                  className="h-20"
                />
                <p className="text-xs text-muted-foreground mt-1">Displayed below the logo on receipts and invoices.</p>
              </div>
              <div>
                <Label>Footer Text</Label>
                <Textarea
                  value={form.receipt_footer}
                  onChange={(e) => f("receipt_footer", e.target.value)}
                  placeholder="e.g. Returns accepted within 7 days with receipt. TIN: 123456789"
                  className="h-20"
                />
                <p className="text-xs text-muted-foreground mt-1">Displayed at the bottom of receipts and invoices.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="website" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>The main banner on the homepage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentField("hero_subtitle", "Subtitle")}
              {contentField("hero_title", "Title")}
              {contentField("hero_description", "Description", true)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>Three feature highlights below the hero.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentField("feature_1_title", "Feature 1 Title")}
                {contentField("feature_1_desc", "Feature 1 Description")}
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentField("feature_2_title", "Feature 2 Title")}
                {contentField("feature_2_desc", "Feature 2 Description")}
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentField("feature_3_title", "Feature 3 Title")}
                {contentField("feature_3_desc", "Feature 3 Description")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Newsletter</CardTitle>
              <CardDescription>Newsletter signup section on the homepage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentField("newsletter_title", "Title")}
              {contentField("newsletter_desc", "Description", true)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Page</CardTitle>
              <CardDescription>Main heading and story text on the About page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentField("about_title", "Title")}
              {contentField("about_description", "Description", true)}
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">Values Section</p>
              {contentField("about_value_1_title", "Value 1 Title (e.g. Sustainable)")}
              {contentField("about_value_1_desc", "Value 1 Description", true)}
              {contentField("about_value_2_title", "Value 2 Title (e.g. Community)")}
              {contentField("about_value_2_desc", "Value 2 Description", true)}
              {contentField("about_value_3_title", "Value 3 Title (e.g. Quality)")}
              {contentField("about_value_3_desc", "Value 3 Description", true)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Footer</CardTitle>
              <CardDescription>Brand description in the footer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentField("footer_description", "Footer Description", true)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
              <CardDescription>Address, phone, and email shown on the Contact page and footer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contentField("contact_title", "Page Title")}
              {contentField("contact_description", "Page Description", true)}
              {contentField("contact_label_visit", "Visit Us Label")}
              {contentField("contact_address", "Address")}
              {contentField("contact_label_call", "Call Us Label")}
              {contentField("contact_phone", "Phone")}
              {contentField("contact_label_email", "Email Us Label")}
              {contentField("contact_email", "Email")}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveContent} disabled={savingContent}>
              <Save className="h-4 w-4 mr-2" /> {savingContent ? "Saving..." : "Save Website Content"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
