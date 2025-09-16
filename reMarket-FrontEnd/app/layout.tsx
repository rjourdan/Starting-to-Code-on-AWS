import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { Suspense } from "react"
import { Header } from "@/components/header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ReMarket - Buy and Sell in Your Community",
  description: "A marketplace for second-hand products",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <Suspense fallback={null}>
            <AuthProvider>
               <Header />
              {children}
            </AuthProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}