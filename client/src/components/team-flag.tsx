import { getCountryFlag, getCountryFlagEmoji } from "@/lib/countries";

interface TeamFlagProps {
  country?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "w-4 h-3",
  sm: "w-5 h-4",
  md: "w-6 h-[18px]",
};

export function TeamFlag({ country, size = "sm", className = "" }: TeamFlagProps) {
  const code = country || "SK";
  return (
    <img
      src={getCountryFlag(code)}
      alt={`${code}`}
      className={`${SIZE_CLASSES[size]} object-cover rounded-sm border border-border inline-block flex-shrink-0 ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = "none";
        const span = document.createElement("span");
        span.textContent = getCountryFlagEmoji(code);
        span.className = "text-xs";
        e.currentTarget.parentNode?.insertBefore(span, e.currentTarget);
      }}
    />
  );
}
