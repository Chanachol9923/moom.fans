import { Chakra_Petch, IBM_Plex_Sans_Thai, Pixelify_Sans } from "next/font/google";

// Latin headings in a pixel face; Thai falls back to Chakra Petch, whose squared
// strokes sit comfortably next to it. Body text stays readable in Plex Thai.
export const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const thaiDisplay = Chakra_Petch({
  subsets: ["thai", "latin"],
  weight: ["500", "600"],
  variable: "--font-thai-display",
  display: "swap",
});

export const thaiBody = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-thai-body",
  display: "swap",
});

export const fontVars = `${pixel.variable} ${thaiDisplay.variable} ${thaiBody.variable}`;
