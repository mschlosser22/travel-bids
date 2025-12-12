import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { PostHogProvider } from "@/providers/posthog-provider";
import { Suspense } from "react";
import NavigationWrapper from "@/components/Navigation/NavigationWrapper";
import { getCurrentUser } from "@/lib/auth-helpers";
import { GoogleAnalytics } from "@/components/Analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/Analytics/MetaPixel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Reservation Portal - Book Your Perfect Hotel",
  description: "Official hotel reservation system. Find and book hotels worldwide at the best prices. Instant confirmation, free cancellation, and secure booking guaranteed.",
  keywords: ["hotels", "hotel booking", "hotel reservations", "travel", "accommodation", "book hotels", "hotel deals"],
  authors: [{ name: "Hotel Reservation Portal" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#2563EB",
  robots: "index, follow",
  openGraph: {
    type: "website",
    title: "Hotel Reservation Portal - Book Your Perfect Hotel",
    description: "Official hotel reservation system. Find and book hotels worldwide at the best prices",
    siteName: "Hotel Reservation Portal",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser()

  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <MetaPixel pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <Suspense fallback={null}>
            <PostHogProvider>
              <NavigationWrapper user={user} />
              {children}
            </PostHogProvider>
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
