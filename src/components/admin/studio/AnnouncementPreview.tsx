import { forwardRef } from "react";
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
import Konva from "konva";
import {
  COLORS,
  FONTS,
  FORMATS,
  PlatformFormat,
  TAGLINE,
  SITE_URL,
  BRAND_NAME,
  WHATSAPP_NUMBER,
  SOFT_GOLD,
} from "./templates/brandTokens";
import { AnnouncementTemplate } from "./templates/announcementRenderers";

interface Props {
  template: AnnouncementTemplate;
  values: Record<string, string>;
  format: PlatformFormat;
  logo: HTMLImageElement | null;
  scale?: number;
}

// eslint-disable-next-line react/display-name
export const AnnouncementPreview = forwardRef<Konva.Stage, Props>(
  ({ template, values, format, logo, scale = 0.5 }, ref) => {
    const dim = FORMATS[format];
    const { w, h } = dim;
    const accent =
      (COLORS as Record<string, string>)[template.accent] ?? COLORS.terracotta;

    // Treatment: respectful (memorial) → quiet dark; cream/light templates → light bg.
    // Sale/promo/badge templates → dark bg with gold accent banner.
    const isSale =
      ["flash_sale", "promotion", "free_delivery"].includes(template.key) ||
      template.badge === "PROMO" ||
      template.badge === "LIMITED";
    const isLight = template.accent === "cream";
    const isRespectful = !!template.respectful;

    const bg = isRespectful
      ? COLORS.charcoal
      : isLight
        ? COLORS.cream
        : isSale
          ? COLORS.midnight
          : COLORS.warmWhite;
    const textColor = bg === COLORS.warmWhite || bg === COLORS.cream ? COLORS.charcoal : COLORS.warmWhite;
    const subColor = textColor;

    const padX = Math.round(w * 0.07);
    const headlineSize = Math.round(w * (h > w ? 0.085 : 0.075));
    const sublineSize = Math.round(w * 0.032);
    const logoSize = Math.round(w * 0.1);

    const headline =
      values._headline?.trim() ||
      template.buildHeadline?.(values) ||
      template.defaultHeadline;
    const subline =
      values._subline?.trim() ||
      template.buildSubline?.(values) ||
      template.defaultSubline ||
      "";

    return (
      <Stage
        ref={ref}
        width={w * scale}
        height={h * scale}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {/* Base */}
          <Rect x={0} y={0} width={w} height={h} fill={bg} />

          {/* SALE / PROMO: curved gold accent + circular discount badge */}
          {isSale && !isRespectful && (
            <>
              <Circle
                x={w * 0.95}
                y={h * 0.08}
                radius={w * 0.5}
                fill={SOFT_GOLD}
                opacity={0.95}
              />
              <Rect
                x={0}
                y={h - Math.round(w * 0.075)}
                width={w}
                height={Math.round(w * 0.075)}
                fill={SOFT_GOLD}
              />
            </>
          )}

          {/* RESPECTFUL: thin candle-line accent, no decoration */}
          {isRespectful && (
            <Line
              points={[w / 2, h * 0.18, w / 2, h * 0.32]}
              stroke={SOFT_GOLD}
              strokeWidth={2}
              opacity={0.6}
            />
          )}

          {/* DEFAULT/CREAM: editorial frame — thin accent rule top-left */}
          {!isSale && !isRespectful && (
            <>
              <Line
                points={[padX, Math.round(h * 0.22), padX + Math.round(w * 0.12), Math.round(h * 0.22)]}
                stroke={accent}
                strokeWidth={3}
              />
              <Rect
                x={0}
                y={h - Math.round(h * 0.07)}
                width={w}
                height={Math.round(h * 0.07)}
                fill={accent}
                opacity={0.95}
              />
            </>
          )}

          {/* Top brand */}
          <Group x={padX} y={Math.round(h * 0.05)}>
            {logo ? (
              <KImage image={logo} width={logoSize} height={logoSize} />
            ) : (
              <Text
                text={BRAND_NAME}
                fontFamily={FONTS.serif}
                fontStyle="700"
                fontSize={Math.round(w * 0.045)}
                fill={textColor}
              />
            )}
          </Group>

          {/* Caps category label top-right */}
          {!isRespectful && (
            <Text
              x={w - padX - Math.round(w * 0.4)}
              y={Math.round(h * 0.06)}
              width={Math.round(w * 0.4)}
              text={template.title.toUpperCase()}
              fontFamily={FONTS.sans}
              fontStyle="700"
              fontSize={Math.round(w * 0.022)}
              fill={textColor}
              opacity={0.8}
              align="right"
              letterSpacing={3}
            />
          )}

          {/* Badge pill */}
          {template.badge && !isRespectful && (
            <Group
              x={w - padX - Math.round(w * 0.3)}
              y={Math.round(h * 0.11)}
            >
              <Rect
                width={Math.round(w * 0.3)}
                height={Math.round(w * 0.07)}
                fill={isSale ? SOFT_GOLD : accent}
                cornerRadius={Math.round(w * 0.035)}
              />
              <Text
                text={template.badge}
                width={Math.round(w * 0.3)}
                height={Math.round(w * 0.07)}
                align="center"
                verticalAlign="middle"
                fontFamily={FONTS.sans}
                fontStyle="900"
                fontSize={Math.round(w * 0.026)}
                fill={isSale ? COLORS.midnight : COLORS.warmWhite}
                letterSpacing={2}
              />
            </Group>
          )}

          {/* Headline — vertically centered block */}
          <Text
            x={padX}
            y={Math.round(h * (isRespectful ? 0.42 : 0.32))}
            width={w - padX * 2}
            text={headline}
            fontFamily={FONTS.serif}
            fontStyle="700"
            fontSize={headlineSize}
            fill={textColor}
            lineHeight={1.05}
            align={isRespectful ? "center" : "left"}
          />

          {/* Subline */}
          {subline && (
            <Text
              x={padX}
              y={Math.round(h * (isRespectful ? 0.58 : 0.55))}
              width={w - padX * 2}
              text={subline}
              fontFamily={FONTS.sans}
              fontSize={sublineSize}
              fill={subColor}
              opacity={0.88}
              lineHeight={1.4}
              align={isRespectful ? "center" : "left"}
            />
          )}

          {/* Footer — tagline + URL on accent strip */}
          {!isRespectful && (
            <>
              <Text
                x={padX}
                y={h - Math.round(h * 0.05)}
                width={w - padX * 2}
                text={`${WHATSAPP_NUMBER}     ·     ${SITE_URL}`}
                fontFamily={FONTS.sans}
                fontStyle="700"
                fontSize={Math.round(w * 0.024)}
                fill={isSale ? COLORS.midnight : COLORS.warmWhite}
                align="center"
                letterSpacing={2}
              />
            </>
          )}

          {isRespectful && (
            <Text
              x={padX}
              y={h - Math.round(h * 0.07)}
              width={w - padX * 2}
              text={SITE_URL}
              fontFamily={FONTS.sans}
              fontSize={Math.round(w * 0.02)}
              fill={textColor}
              opacity={0.6}
              align="center"
              letterSpacing={3}
            />
          )}

          {/* Quiet tagline above footer for non-sale */}
          {!isSale && !isRespectful && (
            <Text
              x={padX}
              y={h - Math.round(h * 0.13)}
              width={w - padX * 2}
              text={TAGLINE}
              fontFamily={FONTS.serif}
              fontSize={Math.round(w * 0.022)}
              fill={textColor}
              opacity={0.7}
            />
          )}
        </Layer>
      </Stage>
    );
  },
);
