export const metadata = {
  title: "سیستم جمع‌آوری داده‌های سنسور مترو",
  description: "جمع‌آوری و تحلیل داده‌های سنسور در تونل مترو",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
