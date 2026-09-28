/* eslint-disable @next/next/no-css-tags -- Static copy preserves Leaflet's relative public image URLs. */
import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phoenix Malls | Find your next favourite place",
  description: "Explore Phoenix Malls and check live opening hours around the world.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href="/leaflet/leaflet.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
