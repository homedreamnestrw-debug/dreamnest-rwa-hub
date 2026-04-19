import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: string;
  jsonLd?: Record<string, any>;
}

const SITE_URL = "https://dreamnestrw.com";

export function SEO({ title, description, canonical, image, type = "website", jsonLd }: SEOProps) {
  const url = canonical ?? (typeof window !== "undefined" ? window.location.href : SITE_URL);
  const img = image ?? `${SITE_URL}/og-image.jpg`;
  const truncDesc = description.length > 160 ? description.slice(0, 157) + "..." : description;
  const truncTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;

  return (
    <Helmet>
      <title>{truncTitle}</title>
      <meta name="description" content={truncDesc} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={truncTitle} />
      <meta property="og:description" content={truncDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={truncTitle} />
      <meta name="twitter:description" content={truncDesc} />
      <meta name="twitter:image" content={img} />

      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
