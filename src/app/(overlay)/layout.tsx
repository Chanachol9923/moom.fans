import type { Metadata } from "next";
import { fontVars } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Moom overlay",
  robots: { index: false, follow: false },
};

// Separate root layout: OBS needs a fully transparent page with no site chrome.
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={fontVars} style={{ background: "transparent" }}>
      <body
        style={{ background: "transparent", backgroundImage: "none", overflow: "hidden", margin: 0 }}
        className="h-dvh w-dvw select-none"
      >
        {children}
      </body>
    </html>
  );
}
