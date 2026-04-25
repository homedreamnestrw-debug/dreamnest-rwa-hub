import { forwardRef, useMemo } from "react";
import { Stage, Layer, Rect, Image as KImage, Text, Group } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import {
  COLORS,
  FONTS,
  FORMATS,
} from "./templates/brandTokens";
import {
  fmtRWF,
  getLogoBox,
  getTextBlockY,
  ProductData,
  RenderConfig,
  STYLE_PRESETS,
  TAG,
  URL,
  BRAND,
} from "./templates/productCardRenderers";

interface CardPreviewProps {
  config: RenderConfig;
  product: ProductData | null;
  logo: HTMLImageElement | null;
  scale?: number; // visual scale for preview rendering
}

// eslint-disable-next-line react/display-name
export const CardPreview = forwardRef<Konva.Stage, CardPreviewProps>(
  ({ config, product, logo, scale = 0.5 }, ref) => {
    const dim = FORMATS[config.format];
    const preset = STYLE_PRESETS[config.style];
    const [productImg] = useImage(product?.imageUrl ?? "", "anonymous");

    const isVertical = dim.h > dim.w;
    const { w, h } = dim;

    const overlayAlpha = useMemo(() => {
      const userPart = config.overlayOpacity / 100;
      const boost = preset.overlayBoost;
      return Math.min(0.95, userPart + boost);
    }, [config.overlayOpacity, preset.overlayBoost]);

    // Background
    const bgColor =
      preset.bg === "image" ? COLORS.charcoal : COLORS[preset.bg as keyof typeof COLORS];
    const accentColor = COLORS[preset.accent];
    const textColor = preset.textColor;
    const fontKey = config.font;
    const family = FONTS[fontKey];

    // Image fit (cover)
    let imgRect = { x: 0, y: 0, width: w, height: h };
    if (productImg && preset.showImage) {
      const ir = productImg.width / productImg.height;
      const cr = w / h;
      if (ir > cr) {
        const nh = h;
        const nw = nh * ir;
        imgRect = { x: (w - nw) / 2, y: 0, width: nw, height: nh };
      } else {
        const nw = w;
        const nh = nw / ir;
        imgRect = { x: 0, y: (h - nh) / 2, width: nw, height: nh };
      }
    }

    // Text positions
    const textY = getTextBlockY(config.textPosition, h);
    const padX = Math.round(w * 0.06);
    const innerW = w - padX * 2;

    // Font sizing
    const baseTitle = isVertical ? Math.round(w * 0.085) : Math.round(w * 0.07);
    const titleSize =
      config.style === "bold" ? Math.round(baseTitle * 1.25) : baseTitle;
    const priceSize = Math.round(titleSize * 0.7);
    const smallSize = Math.round(w * 0.022);

    // Logo
    const logoSize = Math.round(w * 0.12);
    const logoBox =
      logo && config.overlays.showLogo
        ? getLogoBox(config.logoPosition, w, h, logoSize)
        : null;

    // Badges
    const badges: { label: string; color: string }[] = [];
    if (config.overlays.showNewArrival)
      badges.push({ label: "NEW ARRIVAL", color: accentColor });
    if (config.overlays.showBestSeller)
      badges.push({ label: "BEST SELLER", color: COLORS.forest });
    if (config.overlays.showSale)
      badges.push({
        label: `${config.overlays.salePct}% OFF`,
        color: COLORS.terracotta,
      });
    if (
      config.overlays.showLowStock &&
      product?.stock != null &&
      product.stock > 0
    )
      badges.push({
        label: `Only ${product.stock} left!`,
        color: COLORS.terracotta,
      });
    if (config.style === "urgent" && !config.overlays.showLowStock) {
      const left = product?.stock ?? 3;
      if (left > 0)
        badges.push({
          label: `Only ${left} left!`,
          color: COLORS.terracotta,
        });
    }

    return (
      <Stage
        ref={ref}
        width={w * scale}
        height={h * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {/* Background base */}
          <Rect x={0} y={0} width={w} height={h} fill={bgColor} />

          {/* Product image */}
          {productImg && preset.showImage && (
            <KImage
              image={productImg}
              x={imgRect.x}
              y={imgRect.y}
              width={imgRect.width}
              height={imgRect.height}
            />
          )}

          {/* Color overlay (skipped for minimal which uses white bg) */}
          {preset.bg === "image" && (
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              fill={accentColor}
              opacity={overlayAlpha}
            />
          )}
          {config.style === "cozy" && (
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              fill={COLORS.cream}
              opacity={Math.min(0.5, overlayAlpha)}
            />
          )}

          {/* Logo */}
          {logo && logoBox && (
            <KImage
              image={logo}
              x={logoBox.x}
              y={logoBox.y}
              width={logoSize}
              height={logoSize}
            />
          )}

          {/* Brand wordmark fallback if logo missing */}
          {!logo && config.overlays.showLogo && (
            <Text
              text={BRAND}
              x={padX}
              y={Math.round(h * 0.04)}
              fontFamily={FONTS.serif}
              fontSize={Math.round(w * 0.04)}
              fontStyle="700"
              fill={textColor}
            />
          )}

          {/* Badges row */}
          {badges.length > 0 && (
            <Group x={padX} y={Math.round(h * 0.04) + (logoBox ? 0 : 0)}>
              {badges.map((b, i) => (
                <Group
                  key={b.label + i}
                  x={
                    i *
                    (Math.round(w * 0.18) + Math.round(w * 0.02))
                  }
                  y={
                    config.logoPosition === "top-left" && logoBox
                      ? logoSize + Math.round(w * 0.02)
                      : 0
                  }
                >
                  <Rect
                    width={Math.round(w * 0.22)}
                    height={Math.round(w * 0.05)}
                    fill={b.color}
                    cornerRadius={Math.round(w * 0.025)}
                  />
                  <Text
                    text={b.label}
                    width={Math.round(w * 0.22)}
                    height={Math.round(w * 0.05)}
                    align="center"
                    verticalAlign="middle"
                    fontFamily={FONTS.sans}
                    fontStyle="700"
                    fontSize={Math.round(w * 0.022)}
                    fill={COLORS.warmWhite}
                  />
                </Group>
              ))}
            </Group>
          )}

          {/* Title block */}
          {product && config.overlays.showName && (
            <Text
              text={product.name}
              x={padX}
              y={textY}
              width={innerW}
              fontFamily={family}
              fontSize={titleSize}
              fontStyle={
                config.style === "bold" || fontKey === "display" ? "900" : "600"
              }
              fill={textColor}
              align={config.style === "minimal" ? "left" : "left"}
              lineHeight={1.05}
            />
          )}

          {/* Price */}
          {product && config.overlays.showPrice && (
            <Text
              text={
                config.overlays.showSale
                  ? `${fmtRWF(
                      Math.round(
                        product.price * (1 - config.overlays.salePct / 100),
                      ),
                    )}`
                  : fmtRWF(product.price)
              }
              x={padX}
              y={textY + titleSize * 2.2}
              width={innerW}
              fontFamily={FONTS.sans}
              fontSize={priceSize}
              fontStyle="700"
              fill={config.style === "minimal" ? accentColor : textColor}
            />
          )}

          {/* Original price strikethrough when sale */}
          {product && config.overlays.showPrice && config.overlays.showSale && (
            <Text
              text={fmtRWF(product.price)}
              x={padX}
              y={textY + titleSize * 2.2 + priceSize + 6}
              width={innerW}
              fontFamily={FONTS.sans}
              fontSize={Math.round(priceSize * 0.55)}
              fill={textColor}
              opacity={0.6}
              textDecoration="line-through"
            />
          )}

          {/* SKU */}
          {product && config.overlays.showSku && product.sku && (
            <Text
              text={`SKU: ${product.sku}`}
              x={padX}
              y={
                textY +
                titleSize * 2.2 +
                priceSize +
                (config.overlays.showSale ? priceSize * 0.7 + 12 : 12)
              }
              fontFamily={FONTS.sans}
              fontSize={smallSize}
              fill={textColor}
              opacity={0.7}
            />
          )}

          {/* Description excerpt */}
          {product?.description && config.overlays.showDescription && (
            <Text
              text={
                product.description.length > 80
                  ? product.description.slice(0, 80) + "…"
                  : product.description
              }
              x={padX}
              y={textY + titleSize * 1.1}
              width={innerW}
              fontFamily={FONTS.sans}
              fontSize={Math.round(titleSize * 0.32)}
              fill={textColor}
              opacity={0.85}
              lineHeight={1.3}
            />
          )}

          {/* Tagline */}
          <Text
            text={TAG}
            x={padX}
            y={h - Math.round(w * 0.07)}
            width={innerW}
            fontFamily={FONTS.serif}
            fontStyle="400"
            fontSize={Math.round(w * 0.024)}
            fill={textColor}
            opacity={0.85}
            align="left"
          />

          {/* URL watermark */}
          {config.overlays.showWatermarkUrl && (
            <Text
              text={URL}
              x={padX}
              y={h - Math.round(w * 0.04)}
              width={innerW}
              fontFamily={FONTS.sans}
              fontStyle="700"
              fontSize={Math.round(w * 0.025)}
              fill={textColor}
              opacity={0.95}
              align="right"
            />
          )}
        </Layer>
      </Stage>
    );
  },
);
