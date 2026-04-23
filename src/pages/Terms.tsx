import { PublicLayout } from "@/components/layout/PublicLayout";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { SEO } from "@/components/SEO";

export default function Terms() {
  const { content: c } = useWebsiteContent();
  const body = c.terms_content ?? "Our terms and conditions will be available soon.";

  return (
    <PublicLayout>
      <SEO title="Terms & Conditions | DreamNest" description="Read DreamNest's terms and conditions." />
      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="font-serif text-4xl font-semibold mb-8">
          {c.terms_title ?? "Terms & Conditions"}
        </h1>
        <div className="prose prose-neutral max-w-none whitespace-pre-wrap text-foreground/80 leading-relaxed">
          {body}
        </div>
      </section>
    </PublicLayout>
  );
}
