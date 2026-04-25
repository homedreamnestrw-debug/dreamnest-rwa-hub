import { useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ProductPicker } from "@/components/admin/studio/ProductPicker";
import { StyleControls, StyleControlsValue } from "@/components/admin/studio/StyleControls";
import { OverlayTogglesPanel } from "@/components/admin/studio/OverlayToggles";
import { PlatformFormatTabs } from "@/components/admin/studio/PlatformFormatTabs";
import { CardPreview } from "@/components/admin/studio/CardPreview";
import { VariationGrid } from "@/components/admin/studio/VariationGrid";
import { CaptionPanel } from "@/components/admin/studio/CaptionPanel";
import { ExportBar } from "@/components/admin/studio/ExportBar";
import { AnnouncementsPanel } from "@/components/admin/studio/AnnouncementsPanel";
import {
  FORMATS,
  PlatformFormat,
  StyleVariant,
} from "@/components/admin/studio/templates/brandTokens";
import {
  DEFAULT_OVERLAYS,
  ProductData,
  RenderConfig,
} from "@/components/admin/studio/templates/productCardRenderers";
import { useBrandAssets } from "@/hooks/useBrandAssets";
import { useCreativeHistory } from "@/hooks/useCreativeHistory";
import { Sparkles } from "lucide-react";

export default function CreativeStudio() {
  const { logo } = useBrandAssets();
  const { log } = useCreativeHistory();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [style, setStyle] = useState<StyleVariant>("classic");
  const [format, setFormat] = useState<PlatformFormat>("ig_post");
  const [styleValue, setStyleValue] = useState<StyleControlsValue>({
    font: "serif",
    color: "terracotta",
    overlayOpacity: 30,
    logoPosition: "top-left",
    textPosition: "bottom",
  });
  const [overlays, setOverlays] = useState(DEFAULT_OVERLAYS);
  const [caption, setCaption] = useState("");
  const stageRef = useRef<Konva.Stage>(null);

  const config: RenderConfig = useMemo(
    () => ({
      style,
      format,
      ...styleValue,
      overlays,
    }),
    [style, format, styleValue, overlays],
  );

  const dim = FORMATS[format];
  // fit preview into ~640 wide max, but cap by aspect for tall stories
  const maxW = 560;
  const maxH = 640;
  const scaleW = maxW / dim.w;
  const scaleH = maxH / dim.h;
  const previewScale = Math.min(scaleW, scaleH);

  const handleLog = () => {
    if (!product) return;
    log.mutate({
      asset_type: "product_card",
      product_id: product.id ?? null,
      style_variant: style,
      platform_format: format,
      config: { ...styleValue, overlays },
      caption,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-serif text-2xl font-semibold">Creative Studio</h1>
          <p className="text-sm text-muted-foreground">
            DreamNest-branded social posts in seconds — no Canva required.
          </p>
        </div>
      </div>

      <Tabs defaultValue="product">
        <TabsList>
          <TabsTrigger value="product">Product Cards</TabsTrigger>
          <TabsTrigger value="announce">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[340px,1fr]">
            {/* LEFT controls */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-3">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    1. Pick a product
                  </div>
                  <ProductPicker
                    selectedId={product?.id}
                    onSelect={setProduct}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    2. Platform format
                  </div>
                  <PlatformFormatTabs value={format} onChange={setFormat} />
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground">
                    3. Style controls
                  </div>
                  <StyleControls value={styleValue} onChange={setStyleValue} />
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground">
                    4. Overlays
                  </div>
                  <OverlayTogglesPanel value={overlays} onChange={setOverlays} />
                </CardContent>
              </Card>
            </div>

            {/* RIGHT canvas */}
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    All five styles
                  </div>
                  <VariationGrid
                    baseConfig={config}
                    product={product}
                    logo={logo}
                    selected={style}
                    onSelect={setStyle}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium capitalize">
                        {style} · {dim.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dim.w} × {dim.h} px
                      </div>
                    </div>
                    <ExportBar
                      stageRef={stageRef}
                      filenameBase={
                        product
                          ? `dreamnest-${(product.name || "card")
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")}-${style}-${format}`
                          : `dreamnest-${style}-${format}`
                      }
                      caption={caption}
                      onLogged={handleLog}
                    />
                  </div>
                  <div className="flex justify-center rounded-md border bg-muted/30 p-4">
                    <div
                      className="overflow-hidden rounded-sm shadow-lg"
                      style={{
                        width: dim.w * previewScale,
                        height: dim.h * previewScale,
                      }}
                    >
                      <CardPreview
                        ref={stageRef}
                        config={config}
                        product={product}
                        logo={logo}
                        scale={previewScale}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <CaptionPanel
                    product={product}
                    salePct={overlays.salePct}
                    onCaptionChange={setCaption}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="announce" className="mt-4">
          <AnnouncementsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
