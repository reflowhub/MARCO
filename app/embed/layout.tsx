import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trade In | Widget",
  description: "Trade in your device for cash",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
