import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Checador de Relatórios CEU",
  description: "Verificação automática de atualização dos relatórios de execução de encargos dos CEUs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
