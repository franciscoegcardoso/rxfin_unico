import React from "react";
import { Car } from "lucide-react";
import { normalizeBrandName } from "@/lib/brand-utils";

export const VehicleBrandLogo = ({
  fipeFullName,
  size = "md",
  className = "",
  isSold = false,
}: {
  fipeFullName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  isSold?: boolean;
}) => {
  const cleanName = React.useMemo(() => {
    if (!fipeFullName) return "";
    const withoutNumPrefix = fipeFullName.replace(/^[0-9]+\s*-\s*/, "");
    return normalizeBrandName(withoutNumPrefix);
  }, [fipeFullName]);

  const sizeMap = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };

  // Show first letter of normalized name as fallback
  const firstLetter = cleanName?.charAt(0) || "?";

  if (!fipeFullName) {
    return (
      <div className={`${sizeMap[size]} bg-background border border-border rounded-lg flex items-center justify-center shadow-sm ${className}`}>
        <Car className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`${sizeMap[size]} bg-background border border-border rounded-lg flex items-center justify-center shadow-sm ${className}`}>
      <span className="text-sm font-bold text-muted-foreground">{firstLetter}</span>
    </div>
  );
};
