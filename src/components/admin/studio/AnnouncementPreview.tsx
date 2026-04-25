import { forwardRef } from "react";
import { Stage, Layer, Rect, Image as KImage, Text, Group } from "react-konva";
import Konva from "konva";
import { COLORS, FONTS, FORMATS, PlatformFormat, TAGLINE, SITE_URL, BRAND_NAME } from "./templates/brandTokens";
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
    const accent = COLORS[template.accent as keyof typeof COLORS] ?? COLORS.terracotta;
    const isLight = template.accent === "cream";
    const textColor = isLight ? COLORS.charcoal : COLORS.warmWhite;
    const bg = isLight ? COLORS.cream : COLORS.charcoal;

    const padX = Math.round(w * 0.07);
    const headlineSize = Math.round(w * (h > w ? 0.085 : 0.075));
    const sublineSize = Math.round(w * 0.034);
    const logoSize = Math.round(w * 0.13);

    const headline =
      template.buildHeadline?.(values) ?? template.defaultHeadline;
    const subline =
      template.buildSubline?.(values) ?? template.defaultSubline ?? "";

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

          {/* Accent diagonal band */}
          <Rect
            x={-w * 0.15}
            y={h * 0.55}
            width={w * 1.4}
            height={h * 0.45}
            fill={accent}
            rotation={-6}
          />

          {/* Top brand row */}
          <Group x={padX} y={Math.round(h * 0.05)}>
            {logo ? (
              <KImage image={logo} width={logoSize} height={logoSize} />
            ) : (
              <Text
                text={BRAND_NAME}
                fontFamily={FONTS.serif}
                fontStyle="700"
                fontSize={Math.round(w * 0.05)}
                fill={textColor}
              />
            )}
          </Group>

          {/* Badge */}
          {template.badge && (
            <Group x={w - padX - Math.round(w * 0.28)} y={Math.round(h * 0.05)}>
              <Rect
                width={Math.round(w * 0.28)}
                height={Math.round(w * 0.06)}
                fill={accent}
                cornerRadius={Math.round(w * 0.03)}
              />
              <Text
                text={template.badge}
                width={Math.round(w * 0.28)}
                height={Math.round(w * 0.06)}
                align="center"
                verticalAlign="middle"
                fontFamily={FONTS.sans}
                fontStyle="900"
                fontSize={Math.round(w * 0.024)}
                fill={COLORS.warmWhite}
              />
            </Group>
          )}

          {/* Headline */}
          <Text
            x={padX}
            y={Math.round(h * 0.28)}
            width={w - padX * 2}
            text={headline}
            fontFamily={FONTS.serif}
            fontStyle="700"
            fontSize={headlineSize}
            fill={textColor}
            lineHeight={1.1}
          />

          {/* Subline */}
          {subline && (
            <Text
              x={padX}
              y={Math.round(h * 0.5)}
              width={w - padX * 2}
              text={subline}
              fontFamily={FONTS.sans}
              fontSize={sublineSize}
              fill={textColor}
              opacity={0.92}
              lineHeight={1.35}
            />
          )}

          {/* Tagline + URL footer */}
          <Text
            x={padX}
            y={h - Math.round(w * 0.075)}
            width={w - padX * 2}
            text={template.respectful ? "" : TAGLINE}
            fontFamily={FONTS.serif}
            fontSize={Math.round(w * 0.024)}
            fill={textColor}
            opacity={0.8}
          />
          <Text
            x={padX}
            y={h - Math.round(w * 0.045)}
            width={w - padX * 2}
            text={SITE_URL}
            fontFamily={FONTS.sans}
            fontStyle="700"
            fontSize={Math.round(w * 0.027)}
            fill={textColor}
            opacity={0.95}
            align="right"
          />
        </Layer>
      </Stage>
    );
  },
);
