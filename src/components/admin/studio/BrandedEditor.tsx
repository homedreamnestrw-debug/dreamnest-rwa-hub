import { forwardRef, useEffect, useMemo, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Image as KImage,
  Text,
  Group,
  Line,
} from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import {
  COLORS,
  FONTS,
  FORMATS,
  SOFT_GOLD,
} from "./templates/brandTokens";
import {
  fmtRWF,
  ProductData,
  RenderConfig,
  TAG,
  URL as SITE,
  PHONE,
} from "./templates/productCardRenderers";

export interface ElementPositions {
  [key: string]: { x: number; y: number };
}

export interface ElementTexts {
  [key: string]: string;
}

interface BrandedEditorProps {
  config: RenderConfig;
  product: ProductData | null;
  logo: HTMLImageElement | null;
  scale?: number;
  mainImageUrl?: string | null;
  satelliteUrls?: string[];
  positions: ElementPositions;
  onPositionsChange: (p: ElementPositions) => void;
  texts: ElementTexts;
  onTextsChange: (t: ElementTexts) => void;
  editMode: boolean;
  locked: boolean;
  onEditElement: (key: string, currentText: string, screenRect: { x: number; y: number; w: number; h: number }) => void;
  onSwapMainImage?: (newMain: string) => void;
}

function coverRect(img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  if (ir > cr) {
    const nh = h;
    const nw = nh * ir;
    return { x: (w - nw) / 2, y: 0, width: nw, height: nh };
  }
  const nw = w;
  const nh = nw / ir;
  return { x: 0, y: (h - nh) / 2, width: nw, height: nh };
}

function CoverImage({
  img,
  w,
  h,
  cornerRadius = 0,
}: {
  img: HTMLImageElement | undefined;
  w: number;
  h: number;
  cornerRadius?: number;
}) {
  if (!img) {
    return (
      <Group>
        <Rect width={w} height={h} fill="#E8E2D8" cornerRadius={cornerRadius} />
        <Text
          text="Image"
          width={w}
          height={h}
          align="center"
          verticalAlign="middle"
          fontFamily={FONTS.sans}
          fontSize={Math.round(Math.min(w, h) * 0.1)}
          fill="#A89E8E"
        />
      </Group>
    );
  }
  const r = coverRect(img, w, h);
  return (
    <Group
      clipFunc={(ctx) => {
        const radius = cornerRadius;
        ctx.beginPath();
        if (radius > 0) {
          ctx.moveTo(radius, 0);
          ctx.lineTo(w - radius, 0);
          ctx.quadraticCurveTo(w, 0, w, radius);
          ctx.lineTo(w, h - radius);
          ctx.quadraticCurveTo(w, h, w - radius, h);
          ctx.lineTo(radius, h);
          ctx.quadraticCurveTo(0, h, 0, h - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
        } else {
          ctx.rect(0, 0, w, h);
        }
      }}
    >
      <KImage image={img} x={r.x} y={r.y} width={r.width} height={r.height} />
    </Group>
  );
}

function logoSizePx(key: "sm" | "md" | "lg", w: number) {
  // Scale base sizes (60/100/140 at 1080) proportionally
  const base = key === "sm" ? 60 : key === "lg" ? 140 : 100;
  return Math.round(base * (w / 1080));
}

export const BrandedEditor = forwardRef<Konva.Stage, BrandedEditorProps>(
  (
    {
      config,
      product,
      logo,
      scale = 0.5,
      mainImageUrl,
      satelliteUrls = [],
      positions,
      onPositionsChange,
      texts,
      onTextsChange,
      editMode,
      locked,
      onEditElement,
      onSwapMainImage,
    },
    ref,
  ) => {
    const dim = FORMATS[config.format];
    const w = dim.w;
    const h = dim.h;
    const accent = COLORS[config.color] ?? COLORS.terracotta;
    const finalPrice = useMemo(() => {
      if (!product) return 0;
      return config.overlays.showSale
        ? Math.round(product.price * (1 - config.overlays.salePct / 100))
        : product.price;
    }, [product, config.overlays.showSale, config.overlays.salePct]);

    const [mainImg] = useImage(mainImageUrl ?? "", "anonymous");
    const [sat0] = useImage(satelliteUrls[0] ?? "", "anonymous");
    const [sat1] = useImage(satelliteUrls[1] ?? "", "anonymous");
    const [sat2] = useImage(satelliteUrls[2] ?? "", "anonymous");
    const [sat3] = useImage(satelliteUrls[3] ?? "", "anonymous");
    const sats = [sat0, sat1, sat2, sat3];

    // Snap guides
    const [guides, setGuides] = useState<{ x?: number; y?: number }>({});

    const SNAP = 12; // px
    function snapPos(x: number, y: number) {
      const xs = [0, w / 3, w / 2, (2 * w) / 3, w];
      const ys = [0, h / 3, h / 2, (2 * h) / 3, h];
      let snappedX = x;
      let snappedY = y;
      let gx: number | undefined;
      let gy: number | undefined;
      for (const v of xs) {
        if (Math.abs(x - v) < SNAP) {
          snappedX = v;
          gx = v;
          break;
        }
      }
      for (const v of ys) {
        if (Math.abs(y - v) < SNAP) {
          snappedY = v;
          gy = v;
          break;
        }
      }
      return { x: snappedX, y: snappedY, gx, gy };
    }

    const draggable = !locked;

    function makeDragHandlers(key: string) {
      return {
        draggable,
        onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
          const node = e.target;
          const { x, y, gx, gy } = snapPos(node.x(), node.y());
          node.x(x);
          node.y(y);
          setGuides({ x: gx, y: gy });
        },
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
          const node = e.target;
          onPositionsChange({
            ...positions,
            [key]: { x: node.x(), y: node.y() },
          });
          setGuides({});
        },
      };
    }

    function handleDblClick(key: string, currentText: string) {
      return (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!editMode) return;
        const node = e.target as Konva.Node;
        const stage = node.getStage();
        if (!stage) return;
        const box = node.getClientRect();
        const stageBox = stage.container().getBoundingClientRect();
        onEditElement(key, currentText, {
          x: stageBox.left + box.x,
          y: stageBox.top + box.y,
          w: Math.max(box.width, 120),
          h: Math.max(box.height, 24),
        });
      };
    }

    // Defaults — positions are stored as absolute pixel coords on the unscaled canvas
    const pad = Math.round(w * 0.05);
    const logoPx = logoSizePx(config.overlays.logoSize, w);

    const defaultPositions = useMemo<ElementPositions>(() => {
      const def: ElementPositions = {};
      // Logo position from style controls
      const lp = config.logoPosition;
      const m = Math.round(w * 0.04);
      const logoBgW = logoPx + (config.overlays.logoBg !== "none" ? Math.round(w * 0.04) : 0);
      const logoBgH = logoPx + (config.overlays.logoBg !== "none" ? Math.round(w * 0.02) : 0);
      let lx = m, ly = m;
      switch (lp) {
        case "top-left": lx = m; ly = m; break;
        case "top-right": lx = w - logoBgW - m; ly = m; break;
        case "bottom-left": lx = m; ly = h - logoBgH - m - Math.round(w * 0.16); break;
        case "bottom-right": lx = w - logoBgW - m; ly = h - logoBgH - m - Math.round(w * 0.16); break;
        case "center": lx = (w - logoBgW) / 2; ly = (h - logoBgH) / 2; break;
      }
      def.logo = { x: lx, y: ly };
      def.categoryStrip = { x: 0, y: ly + logoBgH + Math.round(w * 0.015) };
      // Main content area
      const tp = config.textPosition;
      const ty = tp === "top" ? Math.round(h * 0.12) : tp === "center" ? Math.round(h * 0.42) : Math.round(h * 0.62);
      def.productImage = { x: pad, y: ty - Math.round(h * 0.42) > 0 ? Math.round(h * 0.05) : Math.round(h * 0.18) };
      def.productName = { x: pad, y: ty };
      def.price = { x: pad, y: ty + Math.round(w * 0.1) };
      def.tagline = { x: pad, y: h - Math.round(w * 0.22) };
      def.address = { x: pad, y: h - Math.round(w * 0.16) };
      def.actionBar = { x: 0, y: h - Math.round(w * 0.09) };
      def.badges = { x: pad, y: ty - Math.round(w * 0.07) };
      return def;
    }, [w, h, pad, logoPx, config.logoPosition, config.textPosition, config.overlays.logoBg]);

    const P = (key: string) => positions[key] ?? defaultPositions[key] ?? { x: 0, y: 0 };

    // Texts with fallbacks
    const T = (key: string, fallback: string) => texts[key] ?? fallback;

    // Edit-mode dashed border helper
    const editStroke = editMode ? { stroke: accent, strokeWidth: 1, dash: [6, 4] } : {};

    // Image area dimensions
    const galleryView = config.overlays.galleryView;
    const isVertical = h > w;
    const imgAreaW = w - pad * 2;
    const imgAreaH = isVertical ? Math.round(h * 0.42) : Math.round(h * 0.5);

    const mainImgW = galleryView ? Math.round(imgAreaW * 0.65) : imgAreaW;
    const mainImgH = imgAreaH;
    const satCellW = imgAreaW - mainImgW - Math.round(w * 0.015);
    const satHalfH = (imgAreaH - Math.round(w * 0.015)) / 2;
    const satHalfW = (satCellW - Math.round(w * 0.015)) / 2;

    // Action bar background
    const actionBarFill =
      config.overlays.actionBarBg === "terracotta"
        ? COLORS.terracotta
        : config.overlays.actionBarBg === "transparent"
        ? "rgba(0,0,0,0)"
        : COLORS.charcoal;
    const actionBarOpacity = config.overlays.actionBarBg === "transparent" ? 0 : 0.75;

    const actionBarH = Math.round(w * 0.075);
    const actionFontSize = Math.round(w * 0.024);

    const showActionBar =
      config.overlays.showActionPhone ||
      config.overlays.showActionWeb ||
      (config.overlays.showActionAddress && config.overlays.showAddress);

    return (
      <>
        <Stage
          ref={ref}
          width={w * scale}
          height={h * scale}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {/* Background */}
            <Rect width={w} height={h} fill={COLORS.cream} />

            {/* Background tone tied to color shade for ambience */}
            <Rect width={w} height={h} fill={accent} opacity={0.06} />

            {/* Product image / gallery */}
            <Group
              x={P("productImage").x}
              y={P("productImage").y}
              {...makeDragHandlers("productImage")}
            >
              <CoverImage
                img={mainImg ?? undefined}
                w={mainImgW}
                h={mainImgH}
                cornerRadius={Math.round(w * 0.02)}
              />
              {galleryView && (
                <>
                  {/* Terracotta border between main and satellites */}
                  <Rect
                    x={mainImgW + Math.round(w * 0.005)}
                    y={0}
                    width={Math.round(w * 0.005)}
                    height={mainImgH}
                    fill={COLORS.terracotta}
                  />
                  {/* 2x2 grid */}
                  {[0, 1, 2, 3].map((i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const sx = mainImgW + Math.round(w * 0.015) + col * (satHalfW + Math.round(w * 0.01));
                    const sy = row * (satHalfH + Math.round(w * 0.01));
                    return (
                      <Group
                        key={i}
                        x={sx}
                        y={sy}
                        onClick={() => {
                          if (satelliteUrls[i] && onSwapMainImage) onSwapMainImage(satelliteUrls[i]);
                        }}
                        onTap={() => {
                          if (satelliteUrls[i] && onSwapMainImage) onSwapMainImage(satelliteUrls[i]);
                        }}
                      >
                        <CoverImage
                          img={sats[i] ?? undefined}
                          w={satHalfW}
                          h={satHalfH}
                          cornerRadius={Math.round(w * 0.012)}
                        />
                        <Rect
                          width={satHalfW}
                          height={satHalfH}
                          stroke={COLORS.terracotta}
                          strokeWidth={2}
                          cornerRadius={Math.round(w * 0.012)}
                        />
                      </Group>
                    );
                  })}
                </>
              )}
              {editMode && (
                <Rect
                  width={galleryView ? imgAreaW : mainImgW}
                  height={mainImgH}
                  {...editStroke}
                  fill="transparent"
                />
              )}
            </Group>

            {/* Logo + bg pill */}
            {config.overlays.showLogo && (
              <Group x={P("logo").x} y={P("logo").y} {...makeDragHandlers("logo")}>
                {config.overlays.logoBg !== "none" && (
                  <Rect
                    width={logoPx + Math.round(w * 0.04)}
                    height={logoPx + Math.round(w * 0.02)}
                    fill={config.overlays.logoBg === "white" ? "#FFFFFF" : COLORS.charcoal}
                    cornerRadius={(logoPx + Math.round(w * 0.02)) / 2}
                    opacity={0.85}
                  />
                )}
                {logo ? (
                  <KImage
                    image={logo}
                    x={config.overlays.logoBg !== "none" ? Math.round(w * 0.02) : 0}
                    y={config.overlays.logoBg !== "none" ? Math.round(w * 0.01) : 0}
                    width={logoPx}
                    height={logoPx}
                    opacity={config.overlays.logoOpacity / 100}
                  />
                ) : (
                  <Text
                    text="DreamNest"
                    fontFamily={FONTS.serif}
                    fontStyle="700"
                    fontSize={Math.round(logoPx * 0.55)}
                    fill={COLORS.terracotta}
                    opacity={config.overlays.logoOpacity / 100}
                    x={config.overlays.logoBg !== "none" ? Math.round(w * 0.02) : 0}
                    y={config.overlays.logoBg !== "none" ? Math.round(w * 0.01) : 0}
                  />
                )}
                {editMode && (
                  <Rect
                    width={logoPx + (config.overlays.logoBg !== "none" ? Math.round(w * 0.04) : 0)}
                    height={logoPx + (config.overlays.logoBg !== "none" ? Math.round(w * 0.02) : 0)}
                    {...editStroke}
                    fill="transparent"
                  />
                )}
              </Group>
            )}

            {/* Category strip */}
            {config.overlays.showCategoryStrip && (
              <Group x={P("categoryStrip").x} y={P("categoryStrip").y} {...makeDragHandlers("categoryStrip")}>
                {config.overlays.categoryStripStyle === "terracotta" && (
                  <Rect width={w} height={Math.round(w * 0.045)} fill={COLORS.terracotta} opacity={0.5} />
                )}
                {config.overlays.categoryStripStyle === "dark" && (
                  <Rect width={w} height={Math.round(w * 0.045)} fill={COLORS.charcoal} opacity={0.5} />
                )}
                <Text
                  text={T("categoryStrip", config.overlays.categoryStripText)}
                  width={w}
                  height={Math.round(w * 0.045)}
                  align="center"
                  verticalAlign="middle"
                  fontFamily={FONTS.sans}
                  fontStyle="500"
                  fontSize={
                    config.overlays.categoryStripFontSize === "md"
                      ? Math.round(w * 0.022)
                      : Math.round(w * 0.018)
                  }
                  fill={
                    config.overlays.categoryStripStyle === "plain"
                      ? COLORS.charcoal
                      : COLORS.warmWhite
                  }
                  letterSpacing={1}
                  textDecoration={config.overlays.categoryStripStyle === "underline" ? "underline" : ""}
                  onDblClick={handleDblClick("categoryStrip", T("categoryStrip", config.overlays.categoryStripText))}
                  onDblTap={handleDblClick("categoryStrip", T("categoryStrip", config.overlays.categoryStripText))}
                />
                {editMode && (
                  <Rect width={w} height={Math.round(w * 0.045)} {...editStroke} fill="transparent" />
                )}
              </Group>
            )}

            {/* Product name */}
            {product && config.overlays.showName && (
              <Group x={P("productName").x} y={P("productName").y} {...makeDragHandlers("productName")}>
                <Text
                  text={T("productName", product.name)}
                  width={w - pad * 2}
                  fontFamily={FONTS[config.font]}
                  fontStyle="700"
                  fontSize={Math.round(w * 0.062)}
                  fill={COLORS.charcoal}
                  lineHeight={1.05}
                  onDblClick={handleDblClick("productName", T("productName", product.name))}
                  onDblTap={handleDblClick("productName", T("productName", product.name))}
                />
                {editMode && (
                  <Rect width={w - pad * 2} height={Math.round(w * 0.08)} {...editStroke} fill="transparent" />
                )}
              </Group>
            )}

            {/* Price */}
            {product && config.overlays.showPrice && (
              <Group x={P("price").x} y={P("price").y} {...makeDragHandlers("price")}>
                <Text
                  text={T("price", fmtRWF(finalPrice))}
                  fontFamily={FONTS.sans}
                  fontStyle="900"
                  fontSize={Math.round(w * 0.05)}
                  fill={accent}
                  onDblClick={handleDblClick("price", T("price", fmtRWF(finalPrice)))}
                  onDblTap={handleDblClick("price", T("price", fmtRWF(finalPrice)))}
                />
                {editMode && (
                  <Rect width={Math.round(w * 0.4)} height={Math.round(w * 0.06)} {...editStroke} fill="transparent" />
                )}
              </Group>
            )}

            {/* Badges */}
            {(config.overlays.showNewArrival ||
              config.overlays.showBestSeller ||
              config.overlays.showSale ||
              (config.overlays.showLowStock && product?.stock != null && product.stock > 0)) && (
              <Group x={P("badges").x} y={P("badges").y} {...makeDragHandlers("badges")}>
                {[
                  config.overlays.showNewArrival && { label: "NEW ARRIVAL", color: accent },
                  config.overlays.showBestSeller && { label: "BEST SELLER", color: COLORS.forest },
                  config.overlays.showSale && {
                    label: `${config.overlays.salePct}% OFF`,
                    color: COLORS.terracotta,
                  },
                  config.overlays.showLowStock && product?.stock
                    ? { label: `Only ${product.stock} left`, color: COLORS.terracotta }
                    : null,
                ]
                  .filter(Boolean)
                  .map((b: any, i) => {
                    const bw = Math.round(w * 0.26);
                    const bh = Math.round(w * 0.055);
                    const gap = Math.round(w * 0.015);
                    return (
                      <Group key={i} x={i * (bw + gap)}>
                        <Rect width={bw} height={bh} fill={b.color} cornerRadius={bh / 2} />
                        <Text
                          text={b.label}
                          width={bw}
                          height={bh}
                          align="center"
                          verticalAlign="middle"
                          fontFamily={FONTS.sans}
                          fontStyle="900"
                          fontSize={Math.round(bh * 0.42)}
                          fill={COLORS.warmWhite}
                        />
                      </Group>
                    );
                  })}
              </Group>
            )}

            {/* Tagline */}
            {config.overlays.showWatermarkUrl && (
              <Group x={P("tagline").x} y={P("tagline").y} {...makeDragHandlers("tagline")}>
                <Text
                  text={T("tagline", TAG)}
                  width={w - pad * 2}
                  fontFamily={FONTS.serif}
                  fontSize={Math.round(w * 0.022)}
                  fill={COLORS.charcoal}
                  opacity={0.75}
                  onDblClick={handleDblClick("tagline", T("tagline", TAG))}
                  onDblTap={handleDblClick("tagline", T("tagline", TAG))}
                />
                {editMode && <Rect width={w - pad * 2} height={Math.round(w * 0.03)} {...editStroke} fill="transparent" />}
              </Group>
            )}

            {/* Address watermark */}
            {config.overlays.showAddress && (
              <Group x={P("address").x} y={P("address").y} {...makeDragHandlers("address")}>
                <Text
                  text={T("address", config.overlays.addressText)}
                  width={w - pad * 2}
                  fontFamily={FONTS.sans}
                  fontSize={Math.round(w * 0.02)}
                  fill={COLORS.charcoal}
                  opacity={0.6}
                  onDblClick={handleDblClick("address", T("address", config.overlays.addressText))}
                  onDblTap={handleDblClick("address", T("address", config.overlays.addressText))}
                />
                {editMode && <Rect width={w - pad * 2} height={Math.round(w * 0.03)} {...editStroke} fill="transparent" />}
              </Group>
            )}

            {/* Action bar */}
            {showActionBar && (
              <Group x={P("actionBar").x} y={P("actionBar").y} {...makeDragHandlers("actionBar")}>
                {config.overlays.actionBarBg !== "transparent" && (
                  <Rect width={w} height={actionBarH} fill={actionBarFill} opacity={actionBarOpacity} />
                )}
                {/* Top border accent */}
                <Rect width={w} height={Math.round(w * 0.003)} fill={COLORS.terracotta} />
                {(() => {
                  const items: { icon: string; text: string; key: string }[] = [];
                  if (config.overlays.showActionPhone)
                    items.push({ icon: "🛒", text: `${PHONE} — Order here`, key: "actionPhone" });
                  if (config.overlays.showActionWeb)
                    items.push({ icon: "🌐", text: `${SITE} — Shop online`, key: "actionWeb" });
                  if (config.overlays.showActionAddress && config.overlays.showAddress)
                    items.push({ icon: "📍", text: T("address", config.overlays.addressText), key: "actionAddress" });
                  const colW = w / items.length;
                  return items.map((it, i) => (
                    <Group key={it.key} x={i * colW} y={0}>
                      <Text
                        text={`${it.icon}  ${T(it.key, it.text)}`}
                        width={colW}
                        height={actionBarH}
                        align="center"
                        verticalAlign="middle"
                        fontFamily={FONTS.sans}
                        fontStyle="700"
                        fontSize={actionFontSize}
                        fill={COLORS.warmWhite}
                        onDblClick={handleDblClick(it.key, T(it.key, it.text))}
                        onDblTap={handleDblClick(it.key, T(it.key, it.text))}
                      />
                    </Group>
                  ));
                })()}
                {editMode && <Rect width={w} height={actionBarH} {...editStroke} fill="transparent" />}
              </Group>
            )}

            {/* Snap guides overlay */}
            {guides.x !== undefined && (
              <Line points={[guides.x, 0, guides.x, h]} stroke="#3b82f6" strokeWidth={1} dash={[8, 6]} />
            )}
            {guides.y !== undefined && (
              <Line points={[0, guides.y, w, guides.y]} stroke="#3b82f6" strokeWidth={1} dash={[8, 6]} />
            )}
          </Layer>
        </Stage>
      </>
    );
  },
);
BrandedEditor.displayName = "BrandedEditor";
