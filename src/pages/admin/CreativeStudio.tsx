import { useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ProductPicker } from "@/components/admin/studio/ProductPicker";
import { ProductImageStrip } from "@/components/admin/studio/ProductImageStrip";
import { StyleControls, StyleControlsValue } from "@/components/admin/studio/StyleControls";
import { OverlayTogglesPanel } from "@/components/admin/studio/OverlayToggles";
import { LogoControlsPanel } from "@/components/admin/studio/LogoControlsPanel";
import { CategoryStripPanel } from "@/components/admin/studio/CategoryStripPanel";
import { ActionBarPanel } from "@/components/admin/studio/ActionBarPanel";
import { FeatureBadgesPanel } from "@/components/admin/studio/FeatureBadgesPanel";
import { PolishPanel } from "@/components/admin/studio/PolishPanel";
import { StudioUploads } from "@/components/admin/studio/StudioUploads";
import { MainImageAdjustPanel } from "@/components/admin/studio/MainImageAdjustPanel";
import { VariationGrid } from "@/components/admin/studio/VariationGrid";
import { PlatformFormatTabs } from "@/components/admin/studio/PlatformFormatTabs";
import {
  BrandedEditor,
  ElementPositions,
  ElementTexts,
} from "@/components/admin/studio/BrandedEditor";
import { InlineTextEditor } from "@/components/admin/studio/InlineTextEditor";
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
import { Sparkles, Edit3, Lock, Unlock, RotateCcw, Undo2, Redo2 } from "lucide-react";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { LanguageSelector } from "@/components/admin/studio/LanguageSelector";
import { useStudioLanguage } from "@/lib/studioLanguage";

export default function CreativeStudio() {
  const { logo } = useBrandAssets();
  const { log } = useCreativeHistory();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [style, setStyle] = useState<StyleVariant>("editorial");
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
  const canvasHistory = useUndoRedo<{ positions: ElementPositions; texts: ElementTexts }>(
    { positions: {}, texts: {} },
  );
  const { positions, texts } = canvasHistory.value;
  const setPositions = (p: ElementPositions) =>
    canvasHistory.set((prev) => ({ ...prev, positions: p }));
  const setTexts = (t: ElementTexts) =>
    canvasHistory.set((prev) => ({ ...prev, texts: t }));
  const [editMode, setEditMode] = useState(false);
  const [locked, setLocked] = useState(false);
  const [polishedUrl, setPolishedUrl] = useState<string | null>(null);
  const [customUploads, setCustomUploads] = useState<string[]>([]);
  const [editing, setEditing] = useState<
    | { key: string; value: string; rect: { x: number; y: number; w: number; h: number } }
    | null
  >(null);
  const stageRef = useRef<Konva.Stage>(null);

  // When product changes, default main image
  useEffect(() => {
    if (product?.images?.length) {
      setMainImageUrl(product.images[0]);
    } else {
      setMainImageUrl(product?.imageUrl ?? null);
    }
    canvasHistory.reset({ positions: {}, texts: {} });
  }, [product?.id]);

  // Keyboard shortcuts: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z (or +Y) = redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) canvasHistory.redo();
        else canvasHistory.undo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        canvasHistory.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canvasHistory]);

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
  const maxW = 560;
  const maxH = 640;
  const scaleW = maxW / dim.w;
  const scaleH = maxH / dim.h;
  const previewScale = Math.min(scaleW, scaleH);

  const productImages = product?.images ?? (product?.imageUrl ? [product.imageUrl] : []);
  const allImages = useMemo(
    () => [...productImages, ...customUploads],
    [productImages, customUploads],
  );
  const satellites = useMemo(
    () => allImages.filter((u) => u !== mainImageUrl).slice(0, 6),
    [allImages, mainImageUrl],
  );
  const displayedMainUrl = polishedUrl ?? mainImageUrl;

  // Reset polish when main source changes
  useEffect(() => {
    setPolishedUrl(null);
  }, [mainImageUrl]);

  const handleLog = () => {
    if (!product) return;
    log.mutate({
      asset_type: "product_card",
      product_id: product.id ?? null,
      style_variant: style,
      platform_format: format,
      config: { ...styleValue, overlays, positions, texts },
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
            <Card>
              <CardContent className="p-3">
                <Accordion type="multiple" defaultValue={["product", "format", "canvas"]}>
                  <AccordionItem value="product">
                    <AccordionTrigger className="text-sm">1. Product & Images</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <ProductPicker selectedId={product?.id} onSelect={setProduct} />
                      {product && (
                        <ProductImageStrip
                          images={allImages}
                          selected={mainImageUrl}
                          onSelect={setMainImageUrl}
                          galleryView={overlays.galleryView}
                          onToggleGallery={(v) => setOverlays({ ...overlays, galleryView: v })}
                          galleryPosition={overlays.galleryPosition}
                          onGalleryPositionChange={(v) => setOverlays({ ...overlays, galleryPosition: v })}
                          gallerySatCount={overlays.gallerySatCount}
                          onGallerySatCountChange={(n) => setOverlays({ ...overlays, gallerySatCount: n })}
                          gallerySatSize={overlays.gallerySatSize}
                          onGallerySatSizeChange={(n) => setOverlays({ ...overlays, gallerySatSize: n })}
                          gallerySatShape={overlays.gallerySatShape}
                          onGallerySatShapeChange={(s) => setOverlays({ ...overlays, gallerySatShape: s })}
                          gallerySatGap={overlays.gallerySatGap}
                          onGallerySatGapChange={(n) => setOverlays({ ...overlays, gallerySatGap: n })}
                        />
                      )}
                      <StudioUploads
                        uploaded={customUploads}
                        selected={mainImageUrl}
                        onUploaded={(url) => {
                          setCustomUploads((prev) => [...prev, url]);
                          setMainImageUrl(url);
                        }}
                        onSelect={setMainImageUrl}
                        onRemove={(url) => {
                          setCustomUploads((prev) => prev.filter((u) => u !== url));
                          if (mainImageUrl === url) setMainImageUrl(productImages[0] ?? null);
                        }}
                      />
                      <MainImageAdjustPanel value={overlays} onChange={setOverlays} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="format">
                    <AccordionTrigger className="text-sm">2. Platform format</AccordionTrigger>
                    <AccordionContent>
                      <PlatformFormatTabs value={format} onChange={setFormat} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="layout">
                    <AccordionTrigger className="text-sm">3. Frame layout</AccordionTrigger>
                    <AccordionContent>
                      <VariationGrid
                        baseConfig={config}
                        product={product}
                        logo={logo}
                        selected={style}
                        onSelect={setStyle}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="style">
                    <AccordionTrigger className="text-sm">4. Style controls</AccordionTrigger>
                    <AccordionContent>
                      <StyleControls value={styleValue} onChange={setStyleValue} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="features">
                    <AccordionTrigger className="text-sm">5. Feature badges (Special Deal, etc.)</AccordionTrigger>
                    <AccordionContent>
                      <FeatureBadgesPanel value={overlays} onChange={setOverlays} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="polish">
                    <AccordionTrigger className="text-sm">✨ AI Polish (Cloudinary)</AccordionTrigger>
                    <AccordionContent>
                      <PolishPanel
                        sourceUrl={mainImageUrl}
                        onPolished={setPolishedUrl}
                        onReset={() => setPolishedUrl(null)}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="logo">
                    <AccordionTrigger className="text-sm">6. Logo</AccordionTrigger>
                    <AccordionContent>
                      <LogoControlsPanel value={overlays} onChange={setOverlays} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="catstrip">
                    <AccordionTrigger className="text-sm">7. Category strip</AccordionTrigger>
                    <AccordionContent>
                      <CategoryStripPanel value={overlays} onChange={setOverlays} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="overlays">
                    <AccordionTrigger className="text-sm">8. Overlays</AccordionTrigger>
                    <AccordionContent>
                      <OverlayTogglesPanel value={overlays} onChange={setOverlays} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="actionbar">
                    <AccordionTrigger className="text-sm">9. Action bar & address</AccordionTrigger>
                    <AccordionContent>
                      <ActionBarPanel value={overlays} onChange={setOverlays} />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="canvas">
                    <AccordionTrigger className="text-sm">10. Canvas controls</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Toggle pressed={editMode} onPressedChange={setEditMode} size="sm" variant="outline">
                          <Edit3 className="h-3.5 w-3.5" /> Edit Mode
                        </Toggle>
                        <Toggle pressed={locked} onPressedChange={setLocked} size="sm" variant="outline">
                          {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          {locked ? "Locked" : "Unlocked"}
                        </Toggle>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canvasHistory.canUndo}
                          onClick={canvasHistory.undo}
                        >
                          <Undo2 className="h-3.5 w-3.5" /> Undo
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canvasHistory.canRedo}
                          onClick={canvasHistory.redo}
                        >
                          <Redo2 className="h-3.5 w-3.5" /> Redo
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            canvasHistory.set({ positions: {}, texts: {} })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reset positions
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Double-click any text in Edit Mode to edit. Drag to reposition (when unlocked).
                        Cmd/Ctrl+Z to undo, Shift+Cmd/Ctrl+Z to redo.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* RIGHT canvas */}
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium capitalize">
                        {dim.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dim.w} × {dim.h} px · {editMode ? "Editing" : "Preview"} · {locked ? "Locked" : "Drag enabled"}
                      </div>
                    </div>
                    <ExportBar
                      stageRef={stageRef}
                      filenameBase={
                        product
                          ? `dreamnest-${(product.name || "card")
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")}-${format}`
                          : `dreamnest-${format}`
                      }
                      caption={caption}
                      onLogged={handleLog}
                    />
                  </div>
                  <div className="flex justify-center rounded-md border bg-muted/30 p-4">
                    <div
                      className="relative overflow-hidden rounded-sm shadow-lg"
                      style={{
                        width: dim.w * previewScale,
                        height: dim.h * previewScale,
                      }}
                    >
                      <BrandedEditor
                        ref={stageRef}
                        config={config}
                        product={product}
                        logo={logo}
                        scale={previewScale}
                        mainImageUrl={displayedMainUrl}
                        satelliteUrls={satellites}
                        positions={positions}
                        onPositionsChange={setPositions}
                        texts={texts}
                        onTextsChange={setTexts}
                        editMode={editMode}
                        locked={locked}
                        onEditElement={(key, value, rect) =>
                          setEditing({ key, value, rect })
                        }
                        onSwapMainImage={(u) => setMainImageUrl(u)}
                      />
                      {editing && (
                        <InlineTextEditor
                          value={editing.value}
                          rect={editing.rect}
                          onCommit={(v) => {
                            setTexts({ ...texts, [editing.key]: v });
                            setEditing(null);
                          }}
                          onCancel={() => setEditing(null)}
                        />
                      )}
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
