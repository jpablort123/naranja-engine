import "./globals.css";
export const metadata = { title: "CMO Engine", description: "Motor de postproducción para podcasts" };
export default function RootLayout({ children }) {
  return <html lang="es"><body className="font-sans antialiased">{children}</body></html>;
}
