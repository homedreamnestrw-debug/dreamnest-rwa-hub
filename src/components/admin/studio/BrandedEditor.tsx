import { forwardRef, useEffect, useMemo, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Image as KImage,
  Text,
  Group,
  Line,
  Circle,
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
import { CANVAS_STRINGS, StudioLanguage } from "@/lib/studioLanguage";

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
  language?: StudioLanguage;
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
  zoom = 1,
  offsetXPct = 0,
  offsetYPct = 0,
}: {
  img: HTMLImageElement | undefined;
  w: number;
  h: number;
  cornerRadius?: number;
  zoom?: number;
  offsetXPct?: number;
  offsetYPct?: number;
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
  const z = Math.max(0.1, zoom);
  const scaledW = r.width * z;
  const scaledH = r.height * z;
  const baseX = w / 2 - scaledW / 2;
  const baseY = h / 2 - scaledH / 2;
  const dx = (offsetXPct / 100) * w;
  const dy = (offsetYPct / 100) * h;
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
      <KImage
        image={img}
        x={baseX + dx}
        y={baseY + dy}
        width={scaledW}
        height={scaledH}
      />
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
    const [sat4] = useImage(satelliteUrls[4] ?? "", "anonymous");
    const [sat5] = useImage(satelliteUrls[5] ?? "", "anonymous");
    const sats = [sat0, sat1, sat2, sat3, sat4, sat5];

    // Element selection — selected element is movable/editable even if globally locked
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

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

    

    function makeDragHandlers(key: string) {
      const isSelected = selectedKey === key;
      return {
        draggable: !locked || isSelected,
        onMouseDown: () => setSelectedKey(key),
        onTouchStart: () => setSelectedKey(key),
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
    const galleryPosition = config.overlays.galleryPosition ?? "right";
    const gallerySatCount = Math.max(1, Math.min(6, config.overlays.gallerySatCount ?? 4));
    const gallerySatSize = Math.max(50, Math.min(150, config.overlays.gallerySatSize ?? 100)) / 100;
    const gallerySatShape = config.overlays.gallerySatShape ?? "square";
    const isVertical = h > w;
    const imgAreaW = w - pad * 2;
    const imgAreaH = isVertical ? Math.round(h * 0.42) : Math.round(h * 0.5);
    // Gallery gap is user-configurable (px at 1080-base, scaled to canvas width)
    const gallerySatGap = Math.max(0, Math.min(60, config.overlays.gallerySatGap ?? 16));
    const gap = Math.max(2, Math.round((gallerySatGap / 1080) * w));

    // Layout: side (left/right) puts satellites in a column-grid beside main; below puts them in a row beneath main
    const sideMode = galleryView && (galleryPosition === "right" || galleryPosition === "left");
    const belowMode = galleryView && galleryPosition === "below";

    const mainImgW = sideMode ? Math.round(imgAreaW * 0.65) : imgAreaW;
    const mainImgH = belowMode ? Math.round(imgAreaH * 0.7) : imgAreaH;

    // Satellite grid (side): 2 columns. For low counts (1-2) use a single column so cells fill nicely.
    const satSideAreaW = imgAreaW - mainImgW - gap;
    const satSideCols = gallerySatCount <= 2 ? 1 : 2;
    const satSideRows = Math.max(1, Math.ceil(gallerySatCount / satSideCols));
    const cellSideW = (satSideAreaW - gap * (satSideCols - 1)) / satSideCols;
    const cellSideH = (mainImgH - gap * (satSideRows - 1)) / satSideRows;
    const sideTileBase = gallerySatShape === "square"
      ? { w: cellSideW, h: cellSideH }
      : { w: Math.min(cellSideW, cellSideH), h: Math.min(cellSideW, cellSideH) };
    const tileSideW = sideTileBase.w * gallerySatSize;
    const tileSideH = sideTileBase.h * gallerySatSize;

    // Satellite row (below): single row of N
    const cellBelowH = imgAreaH - mainImgH - gap;
    const cellBelowW = (imgAreaW - gap * (gallerySatCount - 1)) / gallerySatCount;
    const belowTileBase = gallerySatShape === "square"
      ? { w: cellBelowW, h: cellBelowH }
      : { w: Math.min(cellBelowW, cellBelowH), h: Math.min(cellBelowW, cellBelowH) };
    const tileBelowW = belowTileBase.w * gallerySatSize;
    const tileBelowH = belowTileBase.h * gallerySatSize;


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

    const onDarkStyle = ["bold_banner", "catalogue", "split_dark"].includes(config.style);
    const textOnBg = onDarkStyle ? COLORS.warmWhite : COLORS.charcoal;

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
            {/* Style-driven background */}
            {(() => {
              const s = config.style;
              const bgFill =
                s === "bold_banner" ? COLORS.midnight
                : s === "catalogue" || s === "split_dark" ? COLORS.charcoal
                : s === "ribbon" ? accent
                : s === "magazine" || s === "minimal_poster" ? COLORS.warmWhite
                : COLORS.cream;
              return (
                <>
                  <Rect width={w} height={h} fill={bgFill} />
                  {/* Style-specific accent shapes */}
                  {s === "bold_banner" && (
                    <Circle x={w * 0.95} y={h * 0.1} radius={w * 0.55} fill={SOFT_GOLD} opacity={0.95} />
                  )}
                  {s === "ribbon" && (
                    <Rect x={0} y={h * 0.18} width={w} height={h * 0.64} fill={COLORS.cream} />
                  )}
                  {s === "split_dark" && (
                    <Rect x={0} y={0} width={w / 2} height={h} fill={COLORS.cream} />
                  )}
                  {s === "editorial_soft" && (
                    <Rect
                      x={0}
                      y={Math.round(h * 0.55)}
                      width={w}
                      height={Math.round(h * 0.45)}
                      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                      fillLinearGradientEndPoint={{ x: 0, y: Math.round(h * 0.45) }}
                      fillLinearGradientColorStops={[0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.35)"]}
                    />
                  )}
                  {s === "minimal_poster" && (
                    <Line points={[w * 0.1, h * 0.5, w * 0.22, h * 0.5]} stroke={accent} strokeWidth={3} />
                  )}
                  {s !== "bold_banner" && s !== "ribbon" && s !== "split_dark" && (
                    <Rect width={w} height={h} fill={accent} opacity={0.06} />
                  )}
                </>
              );
            })()}
            {/* Product image / gallery */}
            <Group
              x={P("productImage").x}
              y={P("productImage").y}
              {...makeDragHandlers("productImage")}
            >
              {/* Main image — position depends on layout */}
              <Group
                x={sideMode && galleryPosition === "left" ? satSideAreaW + gap : 0}
                y={0}
              >
                <CoverImage
                  img={mainImg ?? undefined}
                  w={mainImgW}
                  h={mainImgH}
                  cornerRadius={Math.round(w * 0.02)}
                  zoom={config.overlays.mainImageZoom ?? 1}
                  offsetXPct={config.overlays.mainImageOffsetX ?? 0}
                  offsetYPct={config.overlays.mainImageOffsetY ?? 0}
                />
              </Group>

              {galleryView && (() => {
                const indices = Array.from({ length: gallerySatCount }, (_, i) => i);
                const dividerThickness = Math.round(w * 0.005);

                // Shape-aware tile renderer: draws shape-clipped image + matching stroke
                // centered in a (cellW x cellH) cell with size (tileW x tileH).
                const renderTile = (i: number, cellW: number, cellH: number, tileW: number, tileH: number) => {
                  const cornerR = Math.round(w * 0.012);
                  if (gallerySatShape === "circle") {
                    const side = Math.min(tileW, tileH);
                    const ox = (cellW - side) / 2;
                    const oy = (cellH - side) / 2;
                    return (
                      <Group x={ox} y={oy}>
                        <CoverImage img={sats[i] ?? undefined} w={side} h={side} cornerRadius={side / 2} />
                        <Rect
                          width={side}
                          height={side}
                          stroke={COLORS.terracotta}
                          strokeWidth={2}
                          cornerRadius={side / 2}
                        />
                      </Group>
                    );
                  }
                  if (gallerySatShape === "diamond") {
                    // Inscribe a rotated square within the tile bounds: side = min(tileW, tileH) / sqrt(2)
                    const bound = Math.min(tileW, tileH);
                    const side = bound / Math.SQRT2;
                    return (
                      <Group
                        x={cellW / 2}
                        y={cellH / 2}
                        rotation={45}
                        offsetX={side / 2}
                        offsetY={side / 2}
                      >
                        <CoverImage img={sats[i] ?? undefined} w={side} h={side} cornerRadius={0} />
                        <Rect
                          width={side}
                          height={side}
                          stroke={COLORS.terracotta}
                          strokeWidth={2}
                        />
                      </Group>
                    );
                  }
                  // square (default)
                  const ox = (cellW - tileW) / 2;
                  const oy = (cellH - tileH) / 2;
                  return (
                    <Group x={ox} y={oy}>
                      <CoverImage img={sats[i] ?? undefined} w={tileW} h={tileH} cornerRadius={cornerR} />
                      <Rect
                        width={tileW}
                        height={tileH}
                        stroke={COLORS.terracotta}
                        strokeWidth={2}
                        cornerRadius={cornerR}
                      />
                    </Group>
                  );
                };

                if (sideMode) {
                  const isLeft = galleryPosition === "left";
                  const satOriginX = isLeft ? 0 : mainImgW + gap;
                  const dividerX = isLeft ? satSideAreaW + Math.round(gap / 2) : mainImgW + Math.round(gap / 2);
                  return (
                    <>
                      <Rect
                        x={dividerX}
                        y={0}
                        width={dividerThickness}
                        height={mainImgH}
                        fill={COLORS.terracotta}
                      />
                      {indices.map((i) => {
                        const col = i % satSideCols;
                        const row = Math.floor(i / satSideCols);
                        const sx = satOriginX + col * (cellSideW + gap);
                        const sy = row * (cellSideH + gap);
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
                            {renderTile(i, cellSideW, cellSideH, tileSideW, tileSideH)}
                          </Group>
                        );
                      })}
                    </>
                  );
                }
                // belowMode
                return (
                  <>
                    <Rect
                      x={0}
                      y={mainImgH + Math.round(gap / 2)}
                      width={imgAreaW}
                      height={dividerThickness}
                      fill={COLORS.terracotta}
                    />
                    {indices.map((i) => {
                      const sx = i * (cellBelowW + gap);
                      const sy = mainImgH + gap;
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
                          {renderTile(i, cellBelowW, cellBelowH, tileBelowW, tileBelowH)}
                        </Group>
                      );
                    })}
                  </>
                );
              })()}

              {(editMode || selectedKey === "productImage") && (
                <Rect
                  width={galleryView ? imgAreaW : mainImgW}
                  height={imgAreaH}
                  stroke={selectedKey === "productImage" ? COLORS.terracotta : accent}
                  strokeWidth={selectedKey === "productImage" ? 2 : 1}
                  dash={selectedKey === "productImage" ? [] : [6, 4]}
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
                  fill={textOnBg}
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
                  fill={textOnBg}
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
                  fill={textOnBg}
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

            {/* Special Deal banner (top-left) */}
            {config.overlays.showSpecialDeal && (() => {
              const sx = positions.specialDeal?.x ?? Math.round(w * 0.04);
              const sy = positions.specialDeal?.y ?? Math.round(w * 0.04);
              const blockW = Math.round(w * 0.4);
              const titleSize = Math.round(w * 0.075);
              const labelSize = Math.round(w * 0.022);
              const priceSize = Math.round(w * 0.062);
              const sdAccent = config.overlays.specialDealAccent || SOFT_GOLD;
              return (
                <Group x={sx} y={sy} {...makeDragHandlers("specialDeal")}>
                  <Text
                    text="SPECIAL"
                    fontFamily={FONTS.sans}
                    fontStyle="900"
                    fontSize={titleSize}
                    fill={COLORS.warmWhite}
                    letterSpacing={2}
                  />
                  <Text
                    y={titleSize * 1.05}
                    text="DEAL"
                    fontFamily={FONTS.sans}
                    fontStyle="900"
                    fontSize={titleSize}
                    fill={sdAccent}
                    letterSpacing={2}
                  />
                  {/* divider sparkles */}
                  <Line
                    points={[0, titleSize * 2.35, blockW * 0.35, titleSize * 2.35]}
                    stroke={sdAccent}
                    strokeWidth={2}
                  />
                  <Text
                    y={titleSize * 2.55}
                    text="PRICE WAS"
                    fontFamily={FONTS.sans}
                    fontStyle="700"
                    fontSize={labelSize}
                    fill={COLORS.warmWhite}
                    letterSpacing={2}
                  />
                  <Text
                    y={titleSize * 2.55 + labelSize * 1.2}
                    text={T("specialDealOld", config.overlays.specialDealOldPrice)}
                    fontFamily={FONTS.sans}
                    fontStyle="900"
                    fontSize={priceSize}
                    fill={COLORS.warmWhite}
                    textDecoration="line-through"
                    onDblClick={handleDblClick("specialDealOld", T("specialDealOld", config.overlays.specialDealOldPrice))}
                    onDblTap={handleDblClick("specialDealOld", T("specialDealOld", config.overlays.specialDealOldPrice))}
                  />
                  <Text
                    y={titleSize * 2.55 + labelSize * 1.2 + priceSize * 1.25}
                    text="NOW"
                    fontFamily={FONTS.sans}
                    fontStyle="700"
                    fontSize={labelSize}
                    fill={COLORS.warmWhite}
                    letterSpacing={2}
                  />
                  <Text
                    y={titleSize * 2.55 + labelSize * 2.4 + priceSize * 1.25}
                    text={T("specialDealNew", config.overlays.specialDealNewPrice)}
                    fontFamily={FONTS.sans}
                    fontStyle="900"
                    fontSize={priceSize * 1.15}
                    fill={sdAccent}
                    onDblClick={handleDblClick("specialDealNew", T("specialDealNew", config.overlays.specialDealNewPrice))}
                    onDblTap={handleDblClick("specialDealNew", T("specialDealNew", config.overlays.specialDealNewPrice))}
                  />
                  {editMode && (
                    <Rect width={blockW} height={titleSize * 4.5 + priceSize * 1.5} {...editStroke} fill="transparent" />
                  )}
                </Group>
              );
            })()}

            {/* Top-right feature pills (gold circle + label) — independent list */}
            {config.overlays.showFeaturePills && config.overlays.featurePills.length > 0 && (() => {
              const pills = config.overlays.featurePills;
              const sx = positions.featurePills?.x ?? Math.round(w * 0.55);
              const sy = positions.featurePills?.y ?? Math.round(w * 0.05);
              const scale = config.overlays.featurePillScale ?? 1;
              const accent = config.overlays.featurePillAccent || SOFT_GOLD;
              const circle = Math.round(w * 0.08 * scale);
              const gap = Math.round(w * 0.025 * scale);
              const labelSize = Math.round(w * 0.022 * scale);
              const glyphs = ["♛", "❀", "✦", "✿", "★"];
              const onDarkBg = ["bold_banner", "catalogue", "split_dark"].includes(config.style);
              const autoLabel = onDarkBg ? COLORS.warmWhite : COLORS.charcoal;
              const labelFill = config.overlays.featurePillTextColor || autoLabel;
              const letterGap = 2;
              const availW = circle * 2;
              const measureWord = (word: string) =>
                word.length * (labelSize * 0.72) + Math.max(0, word.length - 1) * letterGap;
              const spaceW = labelSize * 0.4 + letterGap;
              const wrapPillLabel = (txt: string) => {
                const words = txt.split(/\s+/).filter(Boolean);
                const lines: string[] = [];
                let current = "";
                let currentW = 0;
                for (const word of words) {
                  const ww = measureWord(word);
                  if (!current) {
                    current = word;
                    currentW = ww;
                  } else if (currentW + spaceW + ww <= availW * 0.94) {
                    current += ` ${word}`;
                    currentW += spaceW + ww;
                  } else {
                    lines.push(current);
                    current = word;
                    currentW = ww;
                  }
                }
                if (current) lines.push(current);
                return lines.length > 0 ? lines : [txt];
              };
              return (
                <Group x={sx} y={sy} {...makeDragHandlers("featurePills")}>
                  {pills.map((label, i) => {
                    const cx = i * (circle * 2 + gap);
                    const key = `featurePill_${i}`;
                    const text = T(key, label);
                    const displayLines = wrapPillLabel(text);
                    const displayText = displayLines.join("\n");
                    const textY = circle * 2 + Math.round(w * 0.012);
                    const textBlockH = displayLines.length * labelSize * 1.2;
                    const underlineY = textY + textBlockH + Math.round(w * 0.014);
                    return (
                      <Group key={key} x={cx}>
                        <Rect
                          width={circle * 2}
                          height={circle * 2}
                          cornerRadius={circle}
                          stroke={accent}
                          strokeWidth={Math.max(2, Math.round(w * 0.005))}
                        />
                        <Text
                          text={glyphs[i % glyphs.length]}
                          width={circle * 2}
                          height={circle * 2}
                          align="center"
                          verticalAlign="middle"
                          fontSize={circle * 0.95}
                          fill={accent}
                        />
                        <Text
                          y={textY}
                          width={circle * 2}
                          align="center"
                          text={displayText}
                          fontFamily={FONTS.sans}
                          fontStyle="900"
                          fontSize={labelSize}
                          fill={labelFill}
                          letterSpacing={2}
                          lineHeight={1.2}
                          onDblClick={handleDblClick(key, text)}
                          onDblTap={handleDblClick(key, text)}
                        />
                        <Line
                          points={[circle * 0.5, underlineY, circle * 1.5, underlineY]}
                          stroke={accent}
                          strokeWidth={2}
                        />
                      </Group>
                    );
                  })}
                </Group>
              );
            })()}

            {/* Bottom feature bar — independent list */}
            {config.overlays.showFeatureBar && config.overlays.featureBarItems.length > 0 && (() => {
              const items = config.overlays.featureBarItems;
              const fbScale = config.overlays.featureBarScale ?? 1;
              const fbAccent = config.overlays.featureBarAccent || SOFT_GOLD;
              const fbText = config.overlays.featureBarTextColor || COLORS.warmWhite;
              const fbBg = config.overlays.featureBarBgColor || COLORS.charcoal;
              const barH = Math.round(w * 0.11 * fbScale);
              const sy = positions.featureBar?.y ?? h - barH - Math.round(w * 0.095);
              const sx = positions.featureBar?.x ?? 0;
              const colW = w / items.length;
              const iconSize = Math.round(barH * 0.5);
              const labelSize = Math.round(w * 0.022 * fbScale);
              const glyphs = ["✦", "↑", "☾", "✿", "★"];
              return (
                <Group x={sx} y={sy} {...makeDragHandlers("featureBar")}>
                  <Rect width={w} height={barH} fill={fbBg} opacity={0.92} />
                  {items.map((label, i) => {
                    const key = `featureBar_${i}`;
                    return (
                      <Group key={key} x={i * colW}>
                        <Text
                          text={glyphs[i % glyphs.length]}
                          x={Math.round(w * 0.04)}
                          y={(barH - iconSize) / 2}
                          fontSize={iconSize}
                          fill={fbAccent}
                        />
                        <Text
                          text={T(key, label)}
                          x={Math.round(w * 0.04) + iconSize + Math.round(w * 0.015)}
                          width={colW - iconSize - Math.round(w * 0.06)}
                          height={barH}
                          verticalAlign="middle"
                          fontFamily={FONTS.sans}
                          fontStyle="900"
                          fontSize={labelSize}
                          fill={fbText}
                          letterSpacing={2}
                          onDblClick={handleDblClick(key, T(key, label))}
                          onDblTap={handleDblClick(key, T(key, label))}
                        />
                        {i < items.length - 1 && (
                          <Rect x={colW - 1} y={barH * 0.2} width={1} height={barH * 0.6} fill={fbAccent} opacity={0.5} />
                        )}
                      </Group>
                    );
                  })}
                  {editMode && <Rect width={w} height={barH} {...editStroke} fill="transparent" />}
                </Group>
              );
            })()}

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
