import "./globals.css";

export const metadata = {
  title: "The Palace",
  description: "A private digital realm"
};

export default function RootLayout({children}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
