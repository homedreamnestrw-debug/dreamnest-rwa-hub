import { forwardRef, useMemo } from "react";
import {
  Stage,
  Layer,
  Rect,
  Image as KImage,
  Text,
  Group,
  Circle,
  Line,
} from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import {
  COLORS,
  ColorKey,
  FONTS,
  FORMATS,
  SOFT_GOLD,
} from "./templates/brandTokens";
import {
  fmtRWF,
  ProductData,
  RenderConfig,
  TAG,
  URL,
  BRAND,
  PHONE,
} from "./templates/productCardRenderers";

interface CardPreviewProps {
  config: RenderConfig;
  product: ProductData | null;
  logo: HTMLImageElement | null;
  scale?: number;
}

interface LayoutCtx {
  w: number;
  h: number;
  product: ProductData | null;
  productImg: HTMLImageElement | undefined;
  logo: HTMLImageElement | null;
  config: RenderConfig;
  accent: string;
  badges: { label: string; color: string }[];
  finalPrice: number;
  isOnSale: boolean;
}

// ---------- helpers ----------

function coverRect(
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const cr = w / h;
  if (ir > cr) {
    const nh = h;
    const nw = nh * ir;
    return { x: x + (w - nw) / 2, y, width: nw, height: nh };
  }
  const nw = w;
  const nh = nw / ir;
  return { x, y: y + (h - nh) / 2, width: nw, height: nh };
}

function ImageInPanel({
  img,
  x,
  y,
  w,
  h,
  cornerRadius = 0,
}: {
  img: HTMLImageElement | undefined;
  x: number;
  y: number;
  w: number;
  h: number;
  cornerRadius?: number;
}) {
  if (!img) {
    return (
      <Group x={x} y={y}>
        <Rect width={w} height={h} fill="#E8E2D8" cornerRadius={cornerRadius} />
        <Text
          text="Product image"
          width={w}
          height={h}
          align="center"
          verticalAlign="middle"
          fontFamily={FONTS.sans}
          fontSize={Math.round(w * 0.05)}
          fill="#A89E8E"
        />
      </Group>
    );
  }
  const r = coverRect(img, 0, 0, w, h);
  return (
    <Group
      x={x}
      y={y}
      clipFunc={(ctx) => {
        const radius = cornerRadius;
        if (radius > 0) {
          ctx.beginPath();
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
          ctx.beginPath();
          ctx.rect(0, 0, w, h);
        }
      }}
    >
      <KImage image={img} x={r.x} y={r.y} width={r.width} height={r.height} />
    </Group>
  );
}

function BrandWordmark({
  x,
  y,
  size,
  color,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  return (
    <Text
      x={x}
      y={y}
      text={BRAND}
      fontFamily={FONTS.serif}
      fontStyle="700"
      fontSize={size}
      fill={color}
    />
  );
}

function BadgeRow({
  badges,
  x,
  y,
  w,
}: {
  badges: { label: string; color: string }[];
  x: number;
  y: number;
  w: number;
}) {
  const bw = Math.round(w * 0.26);
  const bh = Math.round(w * 0.055);
  const gap = Math.round(w * 0.015);
  return (
    <Group x={x} y={y}>
      {badges.map((b, i) => (
        <Group key={b.label + i} x={i * (bw + gap)}>
          <Rect width={bw} height={bh} fill={b.color} cornerRadius={bh / 2} />
          <Text
            text={b.label}
            width={bw}
            height={bh}
            align="center"
            verticalAlign="middle"
            fontFamily={FONTS.sans}
            fontStyle="900"
            fontSize={Math.round(bh * 0.45)}
            fill={COLORS.warmWhite}
          />
        </Group>
      ))}
    </Group>
  );
}

function FooterStrip({
  x,
  y,
  w,
  color,
  showUrl,
}: {
  x: number;
  y: number;
  w: number;
  color: string;
  showUrl: boolean;
}) {
  return (
    <>
      <Text
        x={x}
        y={y}
        width={w}
        text={TAG}
        fontFamily={FONTS.serif}
        fontSize={Math.round(w * 0.022)}
        fill={color}
        opacity={0.75}
      />
      {showUrl && (
        <Text
          x={x}
          y={y + Math.round(w * 0.03)}
          width={w}
          text={URL}
          fontFamily={FONTS.sans}
          fontStyle="700"
          fontSize={Math.round(w * 0.024)}
          fill={color}
          opacity={0.95}
          align="right"
        />
      )}
    </>
  );
}

// ---------- Layout: Editorial Frame ----------
function LayoutEditorial(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, badges, finalPrice, isOnSale, config } = ctx;
  const pad = Math.round(w * 0.06);
  const isVertical = h > w;
  const imgH = isVertical ? Math.round(h * 0.55) : Math.round(h * 0.62);
  const imgW = w - pad * 2;
  const imgY = Math.round(h * 0.13);

  return (
    <>
      <Rect width={w} height={h} fill={COLORS.cream} />
      {/* Top brand row */}
      {logo && config.overlays.showLogo ? (
        <KImage
          image={logo}
          x={pad}
          y={pad}
          width={Math.round(w * 0.09)}
          height={Math.round(w * 0.09)}
        />
      ) : (
        <BrandWordmark x={pad} y={pad + 4} size={Math.round(w * 0.035)} color={COLORS.charcoal} />
      )}
      <Text
        x={pad}
        y={pad + 8}
        width={w - pad * 2}
        text="DREAMNEST · BEDDING & DECOR"
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.018)}
        fill={COLORS.taupe}
        align="right"
        letterSpacing={2}
      />
      {/* Image panel */}
      <ImageInPanel img={productImg} x={pad} y={imgY} w={imgW} h={imgH} cornerRadius={Math.round(w * 0.025)} />
      {/* Thin accent rule */}
      <Line
        points={[pad, imgY + imgH + Math.round(h * 0.04), pad + Math.round(w * 0.12), imgY + imgH + Math.round(h * 0.04)]}
        stroke={accent}
        strokeWidth={3}
      />
      {/* Headline */}
      {product && config.overlays.showName && (
        <Text
          x={pad}
          y={imgY + imgH + Math.round(h * 0.06)}
          width={imgW}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="700"
          fontSize={Math.round(w * 0.062)}
          fill={COLORS.charcoal}
          lineHeight={1.05}
        />
      )}
      {/* Price */}
      {product && config.overlays.showPrice && (
        <Group x={pad} y={h - Math.round(h * 0.13)}>
          <Text
            text={fmtRWF(finalPrice)}
            fontFamily={FONTS.sans}
            fontStyle="900"
            fontSize={Math.round(w * 0.05)}
            fill={accent}
          />
          {isOnSale && (
            <Text
              x={Math.round(w * 0.32)}
              y={Math.round(w * 0.018)}
              text={fmtRWF(product.price)}
              fontFamily={FONTS.sans}
              fontSize={Math.round(w * 0.028)}
              fill={COLORS.charcoal}
              opacity={0.5}
              textDecoration="line-through"
            />
          )}
        </Group>
      )}
      {/* Badges */}
      {badges.length > 0 && (
        <BadgeRow badges={badges.slice(0, 2)} x={pad} y={imgY - Math.round(w * 0.07)} w={w} />
      )}
      <FooterStrip x={pad} y={h - Math.round(w * 0.05)} w={imgW} color={COLORS.charcoal} showUrl={config.overlays.showWatermarkUrl} />
    </>
  );
}

// ---------- Layout: Editorial Soft (gradient at edges only) ----------
function LayoutEditorialSoft(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, badges, finalPrice, isOnSale, config } = ctx;
  const pad = Math.round(w * 0.05);
  return (
    <>
      <Rect width={w} height={h} fill={COLORS.warmWhite} />
      {/* Full bleed image */}
      <ImageInPanel img={productImg} x={0} y={0} w={w} h={h} />
      {/* Top gradient fade */}
      <Rect
        x={0}
        y={0}
        width={w}
        height={Math.round(h * 0.28)}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: Math.round(h * 0.28) }}
        fillLinearGradientColorStops={[0, "rgba(0,0,0,0.55)", 1, "rgba(0,0,0,0)"]}
      />
      {/* Bottom gradient fade */}
      <Rect
        x={0}
        y={Math.round(h * 0.55)}
        width={w}
        height={Math.round(h * 0.45)}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: Math.round(h * 0.45) }}
        fillLinearGradientColorStops={[0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.78)"]}
      />
      {/* Top brand */}
      {logo && config.overlays.showLogo && (
        <KImage image={logo} x={pad} y={pad} width={Math.round(w * 0.1)} height={Math.round(w * 0.1)} />
      )}
      {badges.length > 0 && (
        <BadgeRow badges={badges.slice(0, 2)} x={w - pad - Math.round(w * 0.55)} y={pad + Math.round(w * 0.025)} w={w} />
      )}
      {/* Headline + price */}
      {product && config.overlays.showName && (
        <Text
          x={pad}
          y={h - Math.round(h * 0.32)}
          width={w - pad * 2}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="700"
          fontSize={Math.round(w * 0.07)}
          fill={COLORS.warmWhite}
          lineHeight={1.05}
        />
      )}
      {product && config.overlays.showPrice && (
        <Group x={pad} y={h - Math.round(h * 0.14)}>
          <Rect width={Math.round(w * 0.36)} height={Math.round(w * 0.085)} fill={accent} cornerRadius={Math.round(w * 0.012)} />
          <Text
            text={fmtRWF(finalPrice)}
            width={Math.round(w * 0.36)}
            height={Math.round(w * 0.085)}
            align="center"
            verticalAlign="middle"
            fontFamily={FONTS.sans}
            fontStyle="900"
            fontSize={Math.round(w * 0.038)}
            fill={COLORS.warmWhite}
          />
          {isOnSale && (
            <Text
              x={Math.round(w * 0.4)}
              y={Math.round(w * 0.025)}
              text={fmtRWF(product.price)}
              fontFamily={FONTS.sans}
              fontSize={Math.round(w * 0.028)}
              fill={COLORS.warmWhite}
              opacity={0.7}
              textDecoration="line-through"
            />
          )}
        </Group>
      )}
      <FooterStrip x={pad} y={h - Math.round(w * 0.05)} w={w - pad * 2} color={COLORS.warmWhite} showUrl={config.overlays.showWatermarkUrl} />
    </>
  );
}

// ---------- Layout: Magazine Stack ----------
function LayoutMagazine(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, badges, finalPrice, config } = ctx;
  const pad = Math.round(w * 0.06);
  const imgY = Math.round(h * 0.32);
  const imgH = Math.round(h * 0.5);
  return (
    <>
      <Rect width={w} height={h} fill={COLORS.warmWhite} />
      {/* Caps tagline at top */}
      <Text
        x={pad}
        y={pad + Math.round(w * 0.04)}
        width={w - pad * 2}
        text="THE DREAMNEST EDIT"
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.022)}
        fill={accent}
        align="center"
        letterSpacing={4}
      />
      {/* Logo top-right */}
      {logo && config.overlays.showLogo && (
        <KImage image={logo} x={pad} y={pad} width={Math.round(w * 0.08)} height={Math.round(w * 0.08)} />
      )}
      {/* Big serif headline */}
      {product && config.overlays.showName && (
        <Text
          x={pad}
          y={Math.round(h * 0.13)}
          width={w - pad * 2}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="700"
          fontSize={Math.round(w * 0.085)}
          fill={COLORS.charcoal}
          align="center"
          lineHeight={1}
        />
      )}
      {/* Image panel */}
      <ImageInPanel img={productImg} x={pad} y={imgY} w={w - pad * 2} h={imgH} cornerRadius={Math.round(w * 0.02)} />
      {/* Price tag overlay on image */}
      {product && config.overlays.showPrice && (
        <Group x={w - pad - Math.round(w * 0.32)} y={imgY + imgH - Math.round(w * 0.12)}>
          <Rect width={Math.round(w * 0.32)} height={Math.round(w * 0.085)} fill={COLORS.charcoal} />
          <Text
            text={fmtRWF(finalPrice)}
            width={Math.round(w * 0.32)}
            height={Math.round(w * 0.085)}
            align="center"
            verticalAlign="middle"
            fontFamily={FONTS.sans}
            fontStyle="900"
            fontSize={Math.round(w * 0.035)}
            fill={COLORS.warmWhite}
          />
        </Group>
      )}
      {badges.length > 0 && (
        <BadgeRow badges={badges.slice(0, 2)} x={pad} y={imgY - Math.round(w * 0.07)} w={w} />
      )}
      <FooterStrip x={pad} y={h - Math.round(w * 0.05)} w={w - pad * 2} color={COLORS.charcoal} showUrl={config.overlays.showWatermarkUrl} />
    </>
  );
}

// ---------- Layout: Bold Banner ----------
function LayoutBoldBanner(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, finalPrice, isOnSale, config } = ctx;
  const pad = Math.round(w * 0.05);
  // Curved gold accent (top-right swoosh emulated with circle clip)
  return (
    <>
      <Rect width={w} height={h} fill={COLORS.midnight} />
      {/* Curved accent shape — large soft ellipse top-right */}
      <Circle
        x={w * 0.95}
        y={h * 0.1}
        radius={w * 0.55}
        fill={SOFT_GOLD}
        opacity={0.95}
      />
      {/* Image inset (left half) */}
      <ImageInPanel
        img={productImg}
        x={pad}
        y={Math.round(h * 0.22)}
        w={Math.round(w * 0.5)}
        h={Math.round(h * 0.55)}
        cornerRadius={Math.round(w * 0.02)}
      />
      {/* Logo + brand */}
      {logo && config.overlays.showLogo ? (
        <KImage image={logo} x={pad} y={pad} width={Math.round(w * 0.09)} height={Math.round(w * 0.09)} />
      ) : (
        <BrandWordmark x={pad} y={pad + 6} size={Math.round(w * 0.04)} color={COLORS.warmWhite} />
      )}
      {/* "Today's Pick" caps */}
      <Text
        x={Math.round(w * 0.55)}
        y={Math.round(h * 0.22)}
        width={Math.round(w * 0.4)}
        text="FEATURED"
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.025)}
        fill={COLORS.warmWhite}
        letterSpacing={4}
      />
      {/* Headline */}
      {product && config.overlays.showName && (
        <Text
          x={Math.round(w * 0.55)}
          y={Math.round(h * 0.27)}
          width={Math.round(w * 0.42)}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="900"
          fontSize={Math.round(w * 0.06)}
          fill={COLORS.warmWhite}
          lineHeight={1.05}
        />
      )}
      {/* Circular price/discount badge */}
      {product && config.overlays.showPrice && (
        <Group x={Math.round(w * 0.7)} y={Math.round(h * 0.55)}>
          <Circle radius={Math.round(w * 0.13)} fill={SOFT_GOLD} stroke={COLORS.warmWhite} strokeWidth={4} />
          <Text
            x={-Math.round(w * 0.13)}
            y={-Math.round(w * 0.04)}
            width={Math.round(w * 0.26)}
            text={isOnSale ? `${ctx.config.overlays.salePct}%` : "BUY"}
            align="center"
            fontFamily={FONTS.sans}
            fontStyle="900"
            fontSize={Math.round(w * 0.06)}
            fill={COLORS.midnight}
          />
          <Text
            x={-Math.round(w * 0.13)}
            y={Math.round(w * 0.025)}
            width={Math.round(w * 0.26)}
            text={isOnSale ? "OFF" : "NOW"}
            align="center"
            fontFamily={FONTS.sans}
            fontStyle="700"
            fontSize={Math.round(w * 0.025)}
            fill={COLORS.midnight}
            letterSpacing={3}
          />
        </Group>
      )}
      {/* Price ribbon */}
      {product && config.overlays.showPrice && (
        <Group x={Math.round(w * 0.55)} y={Math.round(h * 0.78)}>
          <Rect width={Math.round(w * 0.4)} height={Math.round(w * 0.085)} fill={COLORS.warmWhite} cornerRadius={Math.round(w * 0.012)} />
          <Text
            text={fmtRWF(finalPrice)}
            width={Math.round(w * 0.4)}
            height={Math.round(w * 0.085)}
            align="center"
            verticalAlign="middle"
            fontFamily={FONTS.sans}
            fontStyle="900"
            fontSize={Math.round(w * 0.04)}
            fill={COLORS.midnight}
          />
        </Group>
      )}
      {/* Contact strip bottom */}
      <Rect x={0} y={h - Math.round(w * 0.075)} width={w} height={Math.round(w * 0.075)} fill={SOFT_GOLD} />
      <Text
        x={pad}
        y={h - Math.round(w * 0.06)}
        width={w - pad * 2}
        text={`${PHONE}     ·     ${URL}`}
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.025)}
        fill={COLORS.midnight}
        align="center"
        letterSpacing={2}
      />
    </>
  );
}

// ---------- Layout: Catalogue Hero ----------
function LayoutCatalogue(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, finalPrice, isOnSale, config } = ctx;
  const sidePanelW = Math.round(w * 0.42);
  const pad = Math.round(w * 0.04);
  return (
    <>
      <Rect width={w} height={h} fill={COLORS.charcoal} />
      {/* Image left */}
      <ImageInPanel
        img={productImg}
        x={0}
        y={0}
        w={w - sidePanelW}
        h={h}
      />
      {/* Side panel */}
      <Rect x={w - sidePanelW} y={0} width={sidePanelW} height={h} fill={COLORS.charcoal} />
      {/* Accent block */}
      <Rect x={w - sidePanelW} y={0} width={Math.round(w * 0.012)} height={h} fill={accent} />
      {/* Logo */}
      {logo && config.overlays.showLogo && (
        <KImage image={logo} x={w - sidePanelW + pad} y={pad} width={Math.round(w * 0.08)} height={Math.round(w * 0.08)} />
      )}
      {/* Brand wordmark on image */}
      <Text
        x={pad}
        y={pad}
        text={BRAND.toUpperCase()}
        fontFamily={FONTS.serif}
        fontStyle="900"
        fontSize={Math.round(w * 0.06)}
        fill={COLORS.warmWhite}
        letterSpacing={2}
      />
      {/* Caps label */}
      <Text
        x={w - sidePanelW + pad}
        y={Math.round(h * 0.22)}
        text="NEW IN STORE"
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.022)}
        fill={accent}
        letterSpacing={3}
      />
      {/* Product name */}
      {product && config.overlays.showName && (
        <Text
          x={w - sidePanelW + pad}
          y={Math.round(h * 0.27)}
          width={sidePanelW - pad * 2}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="700"
          fontSize={Math.round(w * 0.055)}
          fill={COLORS.warmWhite}
          lineHeight={1.05}
        />
      )}
      {/* Feature bullets (description split or defaults) */}
      <Group x={w - sidePanelW + pad} y={Math.round(h * 0.5)}>
        {(product?.description
          ? product.description.split(/[.\n]/).filter(Boolean).slice(0, 4)
          : ["Premium cotton", "Soft & breathable", "Easy care", "Stylish design"]
        ).map((line, i) => (
          <Group key={i} y={i * Math.round(w * 0.04)}>
            <Circle x={4} y={Math.round(w * 0.012)} radius={3} fill={accent} />
            <Text
              x={Math.round(w * 0.025)}
              text={line.trim().slice(0, 32)}
              fontFamily={FONTS.sans}
              fontSize={Math.round(w * 0.022)}
              fill={COLORS.warmWhite}
              opacity={0.9}
            />
          </Group>
        ))}
      </Group>
      {/* Price tag */}
      {product && config.overlays.showPrice && (
        <Group x={w - sidePanelW + pad} y={h - Math.round(h * 0.18)}>
          <Rect width={sidePanelW - pad * 2} height={Math.round(w * 0.09)} fill={accent} />
          <Text
            text={fmtRWF(finalPrice)}
            width={sidePanelW - pad * 2}
            height={Math.round(w * 0.09)}
            align="center"
            verticalAlign="middle"
            fontFamily={FONTS.sans}
            fontStyle="900"
            fontSize={Math.round(w * 0.038)}
            fill={COLORS.warmWhite}
          />
        </Group>
      )}
      <Text
        x={w - sidePanelW + pad}
        y={h - Math.round(w * 0.045)}
        text={`${URL}  ·  ${PHONE}`}
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.02)}
        fill={COLORS.warmWhite}
        opacity={0.8}
      />
    </>
  );
}

// ---------- Layout: Image Ribbon ----------
function LayoutRibbon(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, finalPrice, config } = ctx;
  const pad = Math.round(w * 0.06);
  const cardSize = Math.round(Math.min(w, h) * 0.55);
  const cardX = (w - cardSize) / 2;
  const cardY = Math.round(h * 0.22);
  return (
    <>
      <Rect width={w} height={h} fill={accent} />
      {/* Top diagonal cream stripe */}
      <Rect x={0} y={0} width={w} height={Math.round(h * 0.18)} fill={COLORS.cream} />
      {/* Bottom cream stripe */}
      <Rect x={0} y={h - Math.round(h * 0.22)} width={w} height={Math.round(h * 0.22)} fill={COLORS.cream} />
      {/* Centered image card */}
      <Rect
        x={cardX - 8}
        y={cardY - 8}
        width={cardSize + 16}
        height={cardSize + 16}
        fill={COLORS.warmWhite}
        cornerRadius={Math.round(w * 0.025)}
        shadowColor="black"
        shadowBlur={20}
        shadowOpacity={0.25}
        shadowOffsetY={8}
      />
      <ImageInPanel img={productImg} x={cardX} y={cardY} w={cardSize} h={cardSize} cornerRadius={Math.round(w * 0.02)} />
      {/* Top: brand */}
      {logo && config.overlays.showLogo ? (
        <KImage image={logo} x={pad} y={pad} width={Math.round(w * 0.08)} height={Math.round(w * 0.08)} />
      ) : (
        <BrandWordmark x={pad} y={pad + 4} size={Math.round(w * 0.035)} color={COLORS.charcoal} />
      )}
      {/* Headline below card */}
      {product && config.overlays.showName && (
        <Text
          x={pad}
          y={cardY + cardSize + Math.round(h * 0.04)}
          width={w - pad * 2}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="700"
          fontSize={Math.round(w * 0.055)}
          fill={COLORS.warmWhite}
          align="center"
          lineHeight={1.05}
        />
      )}
      {/* Price */}
      {product && config.overlays.showPrice && (
        <Text
          x={pad}
          y={h - Math.round(h * 0.16)}
          width={w - pad * 2}
          text={fmtRWF(finalPrice)}
          fontFamily={FONTS.sans}
          fontStyle="900"
          fontSize={Math.round(w * 0.05)}
          fill={COLORS.charcoal}
          align="center"
        />
      )}
      <Text
        x={pad}
        y={h - Math.round(h * 0.07)}
        width={w - pad * 2}
        text={`${URL}   ·   ${PHONE}`}
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.022)}
        fill={COLORS.charcoal}
        align="center"
        letterSpacing={2}
      />
    </>
  );
}

// ---------- Layout: Minimal Poster ----------
function LayoutMinimalPoster(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, finalPrice, config } = ctx;
  const pad = Math.round(w * 0.08);
  const imgSize = Math.round(Math.min(w, h) * 0.42);
  const imgX = (w - imgSize) / 2;
  const imgY = Math.round(h * 0.35);
  return (
    <>
      <Rect width={w} height={h} fill={COLORS.warmWhite} />
      {/* Tiny caps label top-center */}
      <Text
        x={pad}
        y={Math.round(h * 0.12)}
        width={w - pad * 2}
        text="DREAMNEST · NEW EDITION"
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.018)}
        fill={accent}
        align="center"
        letterSpacing={6}
      />
      {/* Thin centered rule */}
      <Line
        points={[w / 2 - Math.round(w * 0.04), Math.round(h * 0.17), w / 2 + Math.round(w * 0.04), Math.round(h * 0.17)]}
        stroke={accent}
        strokeWidth={1.5}
      />
      {/* Headline */}
      {product && config.overlays.showName && (
        <Text
          x={pad}
          y={Math.round(h * 0.2)}
          width={w - pad * 2}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="400"
          fontSize={Math.round(w * 0.055)}
          fill={COLORS.charcoal}
          align="center"
          lineHeight={1.1}
        />
      )}
      {/* Centered image, no overlay */}
      <ImageInPanel img={productImg} x={imgX} y={imgY} w={imgSize} h={imgSize} cornerRadius={4} />
      {/* Price minimal */}
      {product && config.overlays.showPrice && (
        <Text
          x={pad}
          y={imgY + imgSize + Math.round(h * 0.06)}
          width={w - pad * 2}
          text={fmtRWF(finalPrice)}
          fontFamily={FONTS.sans}
          fontStyle="700"
          fontSize={Math.round(w * 0.035)}
          fill={accent}
          align="center"
          letterSpacing={2}
        />
      )}
      {/* Bottom brand */}
      {logo && config.overlays.showLogo ? (
        <KImage
          image={logo}
          x={(w - Math.round(w * 0.08)) / 2}
          y={h - Math.round(w * 0.14)}
          width={Math.round(w * 0.08)}
          height={Math.round(w * 0.08)}
        />
      ) : (
        <BrandWordmark x={0} y={h - Math.round(w * 0.07)} size={Math.round(w * 0.03)} color={COLORS.charcoal} />
      )}
      <Text
        x={pad}
        y={h - Math.round(w * 0.04)}
        width={w - pad * 2}
        text={URL}
        fontFamily={FONTS.sans}
        fontSize={Math.round(w * 0.02)}
        fill={COLORS.taupe}
        align="center"
        letterSpacing={3}
      />
    </>
  );
}

// ---------- Layout: Split Dark ----------
function LayoutSplitDark(ctx: LayoutCtx) {
  const { w, h, product, productImg, logo, accent, badges, finalPrice, isOnSale, config } = ctx;
  const isVertical = h > w;
  const pad = Math.round(w * 0.05);
  // Vertical: image top, dark bottom. Wide: image left, dark right.
  if (isVertical) {
    const imgH = Math.round(h * 0.55);
    return (
      <>
        <Rect width={w} height={h} fill={COLORS.charcoal} />
        <ImageInPanel img={productImg} x={0} y={0} w={w} h={imgH} />
        {/* Accent line separator */}
        <Rect x={0} y={imgH} width={w} height={Math.round(h * 0.008)} fill={accent} />
        {logo && config.overlays.showLogo && (
          <KImage image={logo} x={pad} y={pad} width={Math.round(w * 0.09)} height={Math.round(w * 0.09)} />
        )}
        {badges.length > 0 && (
          <BadgeRow badges={badges.slice(0, 2)} x={pad} y={imgH - Math.round(w * 0.085)} w={w} />
        )}
        {product && config.overlays.showName && (
          <Text
            x={pad}
            y={imgH + Math.round(h * 0.04)}
            width={w - pad * 2}
            text={product.name}
            fontFamily={FONTS.serif}
            fontStyle="700"
            fontSize={Math.round(w * 0.07)}
            fill={COLORS.warmWhite}
            lineHeight={1.05}
          />
        )}
        {product && config.overlays.showPrice && (
          <Group x={pad} y={h - Math.round(h * 0.14)}>
            <Text
              text={fmtRWF(finalPrice)}
              fontFamily={FONTS.sans}
              fontStyle="900"
              fontSize={Math.round(w * 0.055)}
              fill={accent}
            />
            {isOnSale && (
              <Text
                x={Math.round(w * 0.36)}
                y={Math.round(w * 0.022)}
                text={fmtRWF(product.price)}
                fontFamily={FONTS.sans}
                fontSize={Math.round(w * 0.028)}
                fill={COLORS.warmWhite}
                opacity={0.5}
                textDecoration="line-through"
              />
            )}
          </Group>
        )}
        <FooterStrip x={pad} y={h - Math.round(w * 0.05)} w={w - pad * 2} color={COLORS.warmWhite} showUrl={config.overlays.showWatermarkUrl} />
      </>
    );
  }
  // Horizontal split
  const imgW = Math.round(w * 0.55);
  return (
    <>
      <Rect width={w} height={h} fill={COLORS.charcoal} />
      <ImageInPanel img={productImg} x={0} y={0} w={imgW} h={h} />
      <Rect x={imgW} y={0} width={Math.round(w * 0.008)} height={h} fill={accent} />
      {logo && config.overlays.showLogo && (
        <KImage image={logo} x={imgW + pad} y={pad} width={Math.round(w * 0.06)} height={Math.round(w * 0.06)} />
      )}
      {product && config.overlays.showName && (
        <Text
          x={imgW + pad}
          y={Math.round(h * 0.25)}
          width={w - imgW - pad * 2}
          text={product.name}
          fontFamily={FONTS.serif}
          fontStyle="700"
          fontSize={Math.round(w * 0.045)}
          fill={COLORS.warmWhite}
          lineHeight={1.05}
        />
      )}
      {product && config.overlays.showPrice && (
        <Text
          x={imgW + pad}
          y={Math.round(h * 0.6)}
          text={fmtRWF(finalPrice)}
          fontFamily={FONTS.sans}
          fontStyle="900"
          fontSize={Math.round(w * 0.045)}
          fill={accent}
        />
      )}
      <Text
        x={imgW + pad}
        y={h - pad - Math.round(w * 0.025)}
        text={URL}
        fontFamily={FONTS.sans}
        fontStyle="700"
        fontSize={Math.round(w * 0.022)}
        fill={COLORS.warmWhite}
        opacity={0.8}
      />
    </>
  );
}

// eslint-disable-next-line react/display-name
export const CardPreview = forwardRef<Konva.Stage, CardPreviewProps>(
  ({ config, product, logo, scale = 0.5 }, ref) => {
    const dim = FORMATS[config.format];
    const [productImg] = useImage(product?.imageUrl ?? "", "anonymous");
    const { w, h } = dim;

    const accent = COLORS[config.color] ?? COLORS.terracotta;

    const finalPrice = useMemo(() => {
      if (!product) return 0;
      return config.overlays.showSale
        ? Math.round(product.price * (1 - config.overlays.salePct / 100))
        : product.price;
    }, [product, config.overlays.showSale, config.overlays.salePct]);

    const badges: { label: string; color: string }[] = [];
    if (config.overlays.showNewArrival)
      badges.push({ label: "NEW ARRIVAL", color: accent });
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
        label: `Only ${product.stock} left`,
        color: COLORS.terracotta,
      });

    const ctx: LayoutCtx = {
      w,
      h,
      product,
      productImg,
      logo,
      config,
      accent,
      badges,
      finalPrice,
      isOnSale: config.overlays.showSale,
    };

    return (
      <Stage
        ref={ref}
        width={w * scale}
        height={h * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {config.style === "editorial" && LayoutEditorial(ctx)}
          {config.style === "editorial_soft" && LayoutEditorialSoft(ctx)}
          {config.style === "magazine" && LayoutMagazine(ctx)}
          {config.style === "bold_banner" && LayoutBoldBanner(ctx)}
          {config.style === "catalogue" && LayoutCatalogue(ctx)}
          {config.style === "ribbon" && LayoutRibbon(ctx)}
          {config.style === "minimal_poster" && LayoutMinimalPoster(ctx)}
          {config.style === "split_dark" && LayoutSplitDark(ctx)}
          {config.style === "mirror_reflection" && LayoutMirrorReflection(ctx)}
        </Layer>
      </Stage>
    );
  },
);
