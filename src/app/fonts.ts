import { Chakra_Petch, IBM_Plex_Sans_Thai, Pixelify_Sans } from "next/font/google";

// Latin headings in a pixel face; Thai falls back to Chakra Petch, whose squared
// strokes sit comfortably next to it. Body text stays readable in Plex Thai.
export const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

// Each weight × subset is a preloaded file, so keep only the weights the design uses:
// 11 files became 7. (font-medium falls back to 400; emphasis uses 600.)
export const thaiDisplay = Chakra_Petch({
  subsets: ["thai", "latin"],
  weight: ["600"],
  variable: "--font-thai-display",
  display: "swap",
});

export const thaiBody = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600"],
  variable: "--font-thai-body",
  display: "swap",
});

export const fontVars = `${pixel.variable} ${thaiDisplay.variable} ${thaiBody.variable}`;
