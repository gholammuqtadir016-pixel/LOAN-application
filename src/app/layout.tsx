import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Loan Application Demo",
  description: "Guided loan application project",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
