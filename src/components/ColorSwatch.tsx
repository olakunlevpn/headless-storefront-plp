import { colorToSwatch } from "@/lib/colors";

type Props = {
  color: string;
  size?: "sm" | "md";
};

export function ColorSwatch({ color, size = "sm" }: Props) {
  const dimension = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <span
      aria-hidden
      className={`inline-block ${dimension} rounded-full border border-black/10`}
      style={{ backgroundColor: colorToSwatch(color) }}
    />
  );
}
