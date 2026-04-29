const SWATCH_MAP: Record<string, string> = {
  green: "#4a6b3a",
  olive: "#7a6f3f",
  ocean: "#3a5a7a",
  purple: "#6a4a8a",
  red: "#a53636",
  black: "#111111",
  white: "#f5f5f5",
  blue: "#2f4f8f",
  navy: "#1f2f5f",
  grey: "#6b6b6b",
  gray: "#6b6b6b",
  beige: "#d4c5a0",
  brown: "#6b4a2b",
  pink: "#d68aa3",
  yellow: "#d6c44a",
  orange: "#d68a4a",
};

const FALLBACK_SWATCH = "#cccccc";

export function colorToSwatch(name: string | null): string {
  if (!name) return FALLBACK_SWATCH;
  const key = name.trim().toLowerCase();
  return SWATCH_MAP[key] ?? key;
}
