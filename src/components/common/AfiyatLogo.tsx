import React from "react";
import { Link } from "react-router-dom";

export type AfiyatLogoVariant = "mark" | "full" | "icon";
export type AfiyatLogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

export interface AfiyatLogoProps {
  /**
   * "mark": Emblem with Urdu calligraphy "عافیت AI" beneath it (ideal for headers and cards)
   * "full": Complete branding with emblem, Urdu calligraphy, and tagline (ideal for hero sections)
   * "icon": Emblem-only mark (ideal for avatars or compact icons)
   */
  variant?: AfiyatLogoVariant;
  /**
   * Predefined responsive sizing
   */
  size?: AfiyatLogoSize;
  /**
   * Optional custom className for sizing or wrapper styling
   */
  className?: string;
  /**
   * Optional router link destination (e.g., "/" for clickable logo)
   */
  linkTo?: string;
  /**
   * Accessible alternative text
   */
  alt?: string;
  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string;
}

const SIZE_MAP: Record<AfiyatLogoVariant, Record<AfiyatLogoSize, string>> = {
  mark: {
    xs: "h-8 w-auto",
    sm: "h-10 w-auto",
    md: "h-12 w-auto",
    lg: "h-16 w-auto",
    xl: "h-20 w-auto",
    hero: "h-28 md:h-36 w-auto",
  },
  full: {
    xs: "h-12 w-auto",
    sm: "h-16 w-auto",
    md: "h-24 w-auto",
    lg: "h-36 w-auto",
    xl: "h-48 w-auto",
    hero: "h-48 sm:h-64 md:h-80 w-auto",
  },
  icon: {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
    hero: "h-28 w-28",
  },
};

const SRC_MAP: Record<AfiyatLogoVariant, string> = {
  mark: "/afiyat-logo-mark.png",
  full: "/afiyat-logo.png",
  icon: "/afiyat-icon.png",
};

export const AfiyatLogo: React.FC<AfiyatLogoProps> = ({
  variant = "mark",
  size = "md",
  className = "",
  linkTo,
  alt = "Afiyat AI (عافیت AI) — Your Health, Our Priority",
  ariaLabel = "Afiyat AI Home",
}) => {
  const src = SRC_MAP[variant];
  const sizeClass = SIZE_MAP[variant][size];

  const imageElement = (
    <img
      src={src}
      alt={alt}
      className={`object-contain transition-transform duration-200 hover:scale-[1.02] ${sizeClass} ${className}`.trim()}
      loading={size === "hero" || size === "lg" ? "eager" : "lazy"}
      decoding="async"
    />
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        aria-label={ariaLabel}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        {imageElement}
      </Link>
    );
  }

  return <div className="inline-flex items-center">{imageElement}</div>;
};

export default AfiyatLogo;
