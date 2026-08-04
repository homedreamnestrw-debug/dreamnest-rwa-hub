import { cn } from "@/lib/utils";

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  /** Tailwind size classes for the square container, e.g. "h-9 w-9". Omit to fill the parent. */
  className?: string;
  /** Rounded corner class */
  rounded?: string;
}

/**
 * Shared square product thumbnail.
 * Uses object-contain on a neutral surface so catalogue shots (white background
 * or tall packshots) are never cropped into an unrecognisable close-up.
 */
export function ProductThumb({
  src,
  alt,
  className = "h-9 w-9",
  rounded = "rounded-md",
}: ProductThumbProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border bg-muted",
        rounded,
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium uppercase text-muted-foreground">
          {alt?.trim()?.charAt(0) || "?"}
        </div>
      )}
    </div>
  );
}

export default ProductThumb;
