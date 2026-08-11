/**
 * Convert a hex color (#rrggbb) to the HSL string format used by CSS variables.
 * Returns a string like "217 91% 60%" (no "hsl()" wrapper, matching globals.css format).
 */
export function hexToHSL(hex: string): string {
  const h = hex.replace(/^#/, "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        hue = ((b - r) / d + 2) * 60;
        break;
      case b:
        hue = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
