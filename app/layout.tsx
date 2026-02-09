
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
// import { UserProvider } from "@auth0/nextjs-auth0/client";
import { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
export const metadata: Metadata = {
  title: "AssetsVista",
  description: "The official Next.js Course Dashboard, built with App Router.",
   
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
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster/>
          </ThemeProvider>
        </body>
      </ClerkProvider>
    </html>
  );
}
