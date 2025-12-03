import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import GoogleAdsConversion from "@/app/components/GoogleAdsConversion";
import { GoogleTagManager, GoogleTagManagerNoScript } from "@/components/GoogleTagManager";
import { RouteChangeListener } from "@/components/RouteChangeListener";
import WhatsAppButton from "@/components/whatsapp-button";
import { whatsappConfig } from "@/lib/config/whatsapp";

const inter = Inter({ subsets: ["latin"] });
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5NC24SHJ'; // ID proporcionado

export const metadata: Metadata = {
  metadataBase: new URL('https://gestor-creditos-webs.vercel.app'),
  title: {
    default: "GestorPro - Software de Gestión de Préstamos y Créditos | Sistema Profesional",
    template: "%s | GestorPro"
  },
  description: "Software profesional para gestionar préstamos, créditos, clientes y cobros. Controla tu negocio de créditos con reportes automáticos, recordatorios y análisis en tiempo real. Prueba gratis 7 días.",
  keywords: [
    "software de préstamos",
    "sistema de créditos",
    "gestión de préstamos",
    "software para prestamistas",
    "control de créditos",
    "sistema de cobranza",
    "gestión de clientes",
    "software financiero",
    "préstamos en línea",
    "sistema de cuotas",
    "cobros automáticos",
    "reportes financieros",
    "gestión de microcréditos",
    "software de microfinanzas"
  ],
  authors: [{ name: "GestorPro" }],
  creator: "GestorPro",
  publisher: "GestorPro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://gestor-creditos-webs.vercel.app',
    siteName: 'GestorPro',
    title: 'GestorPro - Software Profesional de Gestión de Préstamos y Créditos',
    description: 'Gestiona préstamos, clientes y cobros desde una plataforma profesional. Reportes automáticos, recordatorios y control total. Prueba gratis 7 días.',
    images: [
      {
        url: '/dashboard-screenshot.png',
        width: 1200,
        height: 630,
        alt: 'Dashboard de GestorPro - Sistema de Gestión de Préstamos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GestorPro - Software de Gestión de Préstamos',
    description: 'Control total de tu negocio de créditos. Reportes, recordatorios y análisis automáticos.',
    images: ['/dashboard-screenshot.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Agrega aquí tu código de Google Search Console cuando lo tengas
    // google: 'tu-codigo-de-verificacion',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="google-site-verification" content="7uSR0O1iKcIUd_3DOaAOmBXnu-EHVj0KFw_1hMj_KDc" />
        <link rel="canonical" href="https://gestor-creditos-webs.vercel.app" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={inter.className}>
        <GoogleTagManagerNoScript gtmId={GTM_ID} />
        <GoogleTagManager gtmId={GTM_ID} />
        <Suspense fallback={null}>
          <RouteChangeListener />
        </Suspense>
        <GoogleAnalytics />
        <GoogleAdsConversion />
        {children}
        <Toaster />
        <WhatsAppButton 
          phoneNumber={whatsappConfig.phoneNumber} 
          message={whatsappConfig.defaultMessage}
          position={whatsappConfig.position}
        />
      </body>
    </html>
  );
}

