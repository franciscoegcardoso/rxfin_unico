import * as React from "react";
import { cn } from "@/lib/utils";
import { normalizeBrandName } from "@/lib/brand-utils";

// Fallback: letter-based logo when no image available
export interface BrandLogoProps {
  url?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Brand logo renderer for dropdowns/popovers.
 * - Uses a provided URL when available (e.g. from marcas.json)
 * - Falls back to initial letter when image fails or no URL
 */
export const BrandLogo = React.forwardRef<HTMLDivElement, BrandLogoProps>(
  ({ url, name, className }, ref) => {
    const [error, setError] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);

    const src = url || "";

    React.useEffect(() => {
      setError(false);
      setLoaded(false);
    }, [src, name]);

    const pixelSize = 24;

    const containerStyle = {
      width: pixelSize,
      height: pixelSize,
      minWidth: pixelSize,
      minHeight: pixelSize,
    };

    if (!src || error) {
      const normalized = normalizeBrandName(name);
      const firstLetter = normalized?.charAt(0) || name?.charAt(0)?.toUpperCase() || "?";
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-muted-foreground",
            className
          )}
          style={containerStyle}
          aria-label={`Logo ${name}`}
          title={name}
        >
          <span className="text-[10px]">{firstLetter}</span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-full bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden relative",
          className
        )}
        style={containerStyle}
      >
        {!loaded && (
          <div className="absolute inset-0 bg-muted rounded-full animate-pulse" />
        )}
        <img
          src={src}
          alt={`Logo ${name}`}
          width={pixelSize}
          height={pixelSize}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "object-contain",
            !loaded && "opacity-0",
            loaded && "opacity-100 transition-opacity duration-200"
          )}
          style={{ width: pixelSize, height: pixelSize }}
        />
      </div>
    );
  }
);

BrandLogo.displayName = "BrandLogo";
