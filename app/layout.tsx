export const metadata = { title: 'Ekko', description: 'A Slack-native AI agent.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
