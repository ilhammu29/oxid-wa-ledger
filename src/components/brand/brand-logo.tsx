import Image from "next/image";

export interface BrandLogoProps {
  /**
   * Presentation variant:
   * - "symbol": Symbol icon mark only (ideal for navbar with text)
   * - "horizontal": Horizontal lockup of symbol + wordmark
   * - "full": Full vertical lockup of symbol + wordmark
   */
  variant?: "symbol" | "horizontal" | "full";
  /**
   * Predefined size presets for the mark or lockup
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Container style:
   * - "surface" / true: subtle elevated surface with border (matches RedSun aesthetic)
   * - "primary": brand violet container with crisp white symbol
   * - "none" / false: standalone mark with no container box
   */
  container?: "surface" | "primary" | "none" | boolean;
  /**
   * Whether to display "OXID Ledger" text beside the symbol
   */
  showText?: boolean;
  /**
   * Optional custom label text (defaults to "OXID Ledger")
   */
  text?: string;
  /**
   * Next.js image loading priority (use on navbar/hero)
   */
  priority?: boolean;
  /**
   * Optional custom container or wrapper className
   */
  className?: string;
}

const SIZES = {
  sm: { box: "h-7 w-7", imgH: "h-4", text: "text-sm" },
  md: { box: "h-8 w-8", imgH: "h-5", text: "text-base" },
  lg: { box: "h-10 w-10", imgH: "h-6", text: "text-lg" },
  xl: { box: "h-12 w-12", imgH: "h-7.5", text: "text-xl" },
};

export function BrandLogo({
  variant = "symbol",
  size = "md",
  container = "surface",
  showText = false,
  text = "OXID Ledger",
  priority = false,
  className = "",
}: BrandLogoProps) {
  const currentSize = SIZES[size] || SIZES.md;
  const isPrimary = container === "primary";
  const hasContainer = container !== false && container !== "none";

  if (variant === "horizontal") {
    const hSizes = {
      sm: { w: 100, h: 26 },
      md: { w: 125, h: 32 },
      lg: { w: 156, h: 40 },
      xl: { w: 188, h: 48 },
    }[size] || { w: 125, h: 32 };

    return (
      <div className={`inline-flex items-center shrink-0 ${className}`}>
        <Image
          src="/brand/oxid-horizontal-light.png"
          alt={text}
          width={hSizes.w}
          height={hSizes.h}
          className="dark:hidden object-contain w-auto h-auto"
          priority={priority}
        />
        <Image
          src="/brand/oxid-horizontal-dark.png"
          alt={text}
          width={hSizes.w}
          height={hSizes.h}
          className="hidden dark:block object-contain w-auto h-auto"
          priority={priority}
        />
      </div>
    );
  }

  if (variant === "full") {
    const vSizes = {
      sm: { w: 48, h: 72 },
      md: { w: 64, h: 96 },
      lg: { w: 80, h: 120 },
      xl: { w: 96, h: 144 },
    }[size] || { w: 64, h: 96 };

    return (
      <div className={`inline-flex flex-col items-center shrink-0 ${className}`}>
        <Image
          src="/brand/oxid-logo-light.png"
          alt={text}
          width={vSizes.w}
          height={vSizes.h}
          className="dark:hidden object-contain w-auto h-auto"
          priority={priority}
        />
        <Image
          src="/brand/oxid-logo-dark.png"
          alt={text}
          width={vSizes.w}
          height={vSizes.h}
          className="hidden dark:block object-contain w-auto h-auto"
          priority={priority}
        />
      </div>
    );
  }

  // Symbol Variant
  // If primary container is selected, always show white symbol
  const symbolElement = isPrimary ? (
    <Image
      src="/brand/oxid-symbol-dark.png"
      alt={showText ? "" : text}
      aria-hidden={showText ? true : undefined}
      width={730}
      height={865}
      className={`${currentSize.imgH} w-auto object-contain`}
      priority={priority}
    />
  ) : (
    <>
      <Image
        src="/brand/oxid-symbol-light.png"
        alt={showText ? "" : text}
        aria-hidden={showText ? true : undefined}
        width={730}
        height={865}
        className={`dark:hidden ${currentSize.imgH} w-auto object-contain`}
        priority={priority}
      />
      <Image
        src="/brand/oxid-symbol-dark.png"
        alt={showText ? "" : text}
        aria-hidden={showText ? true : undefined}
        width={730}
        height={865}
        className={`hidden dark:block ${currentSize.imgH} w-auto object-contain`}
        priority={priority}
      />
    </>
  );

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      {hasContainer ? (
        <div
          className={`rounded-lg flex items-center justify-center shrink-0 ${
            isPrimary
              ? "bg-primary text-white shadow-xs"
              : "bg-surface border border-border shadow-2xs"
          } ${currentSize.box}`}
        >
          {symbolElement}
        </div>
      ) : (
        <div className="flex items-center justify-center shrink-0">
          {symbolElement}
        </div>
      )}

      {showText && (
        <span className={`font-bold text-foreground tracking-tight ${currentSize.text}`}>
          {text}
        </span>
      )}
    </div>
  );
}
