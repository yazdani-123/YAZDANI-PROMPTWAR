import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Blind Spot",
  description:
    "Explore assumptions, overlooked factors, and questions around a decision.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
