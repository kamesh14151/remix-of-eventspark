interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

const sizes = {
  sm: { glyph: "w-6 h-6", wordmark: "h-5" },
  md: { glyph: "w-8 h-8", wordmark: "h-6 sm:h-7" },
  lg: { glyph: "w-10 h-10", wordmark: "h-8 sm:h-9" },
};

export function Logo({ size = "md", className = "", showText = true }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/crack-logo.png" alt="Crack" className={`${s.glyph} object-contain rounded-lg shrink-0`} />
      {showText && (
        <img src="/Crack.png" alt="Crack" className={`${s.wordmark} object-contain`} />
      )}
    </span>
  );
}
