
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import QueryClientProviderWrapper from "./providers/queryClientProvider";
import { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
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
    <html lang="en" suppressHydrationWarning>
      <ClerkProvider>
        <body>
          <QueryClientProviderWrapper>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster/>
            </ThemeProvider>
          </QueryClientProviderWrapper>
        </body>
      </ClerkProvider>
    </html>
  );
}
