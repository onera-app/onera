import { cn } from "@/lib/utils";

interface OneraLogoProps {
  className?: string;
  size?: number;
}

/**
 * Onera logo component - renders the brand logo SVG
 * Use this component consistently across the app for brand identity
 */
export function OneraLogo({ className, size = 24 }: OneraLogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt="Onera"
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  );
}
