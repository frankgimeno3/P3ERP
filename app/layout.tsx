import type {GetServerSideProps, Metadata} from "next";
import { Geist_Mono, Ubuntu } from "next/font/google";
import "./globals.css";
import ModalDismissManager from "./general_components/componentes_recurrentes/ModalDismissManager";
const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "P3ERP",
  description: "Sistema P3ERP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    return (
    <html lang="en">
      <body
        className={`${ubuntu.variable} ${geistMono.variable} antialiased`}
      >
        <ModalDismissManager />
        {children}
      </body>
    </html>
  );
}
