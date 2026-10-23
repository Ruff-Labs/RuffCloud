import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeInitScript } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RuffCloud",
  description: "Live flyball race timing and results",
};
// The `tooltip` component has been added. Remember to wrap your app with the `TooltipProvider` component.

// ```tsx title="app/layout.tsx"
// import { TooltipProvider } from "@/components/ui/tooltip"

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>
//         <TooltipProvider>{children}</TooltipProvider>
//       </body>
//     </html>
//   )
// }
// ```
export default function RootLayout({ children,}: Readonly<{ children: React.ReactNode;}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
        <head>
            <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body className="min-h-full flex flex-col">
            <TooltipProvider>{children}</TooltipProvider>
        </body>
    </html>
  );
}
