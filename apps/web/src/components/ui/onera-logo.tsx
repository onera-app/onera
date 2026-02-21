import { cn } from "@/lib/utils";

interface OneraLogoProps {
  className?: string;
  size?: number;
}

/**
 * Onera logo component - renders the brand logo
 * Use this component consistently across the app for brand identity
 */
export function OneraLogo({ className, size = 24 }: OneraLogoProps) {
  return (
    <img
      src="/onera-logo.png"
      alt="Onera"
      style={{ width: size, height: size }}
      className={cn("object-cover", className)}
    />
  );
}
