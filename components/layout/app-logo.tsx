import Image from "next/image";
import { siteConfig } from "@/config/site.config";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { width: 120, height: 36, className: "h-9 w-auto max-w-[7.5rem]" },
  md: { width: 140, height: 44, className: "h-11 w-auto max-w-[8.75rem]" },
  lg: { width: 180, height: 56, className: "h-14 w-auto max-w-[11.25rem]" },
} as const;

export function AppLogo({ className, size = "md" }: AppLogoProps) {
  const config = sizeMap[size];

  return (
    <Image
      src="/logo.png"
      alt={siteConfig.name}
      width={config.width}
      height={config.height}
      priority
      className={cn("object-contain", config.className, className)}
    />
  );
}

const wordmarkSizeMap = {
  sm: "text-xl leading-tight",
  md: "text-2xl leading-tight",
  lg: "text-4xl leading-tight",
} as const;

export function OneGisWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight",
        wordmarkSizeMap[size],
        className,
      )}
    >
      <span className="text-[#2b59c3]">One</span>
      <span className="text-[#4fb050]">Gis</span>
    </span>
  );
}
