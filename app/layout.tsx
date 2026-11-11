import "./globals.css";
import "skullet/styles.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSkulletProvider } from "@/components/skullet-provider";
import { Toaster } from "@/components/ui/toaster";
import QueryClientProviderWrapper from "./providers/queryClientProvider";
import { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AssetsVista",
  description: "Enterprise IT Asset Management powered by AssetsVista.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={plusJakartaSans.variable}
      suppressHydrationWarning
    >
      <body className={`${plusJakartaSans.className} font-sans antialiased`}>
        <QueryClientProviderWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AppSkulletProvider>
              {children}
              <Toaster />
            </AppSkulletProvider>
          </ThemeProvider>
        </QueryClientProviderWrapper>
      </body>
    </html>
  );
}
