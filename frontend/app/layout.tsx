import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import CookieBanner from "../components/CookieBanner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MTG Proxy Maker",
  description: "Crea proxies de cartas Magic: The Gathering para imprimir",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={geist.className}>
        {/* Skip link: permite a usuarios de teclado/lector de pantalla saltar la navegación */}
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <AuthProvider>
          {children}
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
