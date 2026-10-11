import type { Metadata } from "next";
import { SessionProvider } from "@/components/session";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://bugrelay.com"),
  title: {
    default: "BugRelay — Better software, together",
    template: "%s · BugRelay",
  },
  description:
    "Report software bugs, follow fixes, and help teams improve their products.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <Shell>{children}</Shell>
        </SessionProvider>
      </body>
    </html>
  );
}
