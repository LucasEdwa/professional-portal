import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HomeWithin — Professional Portal',
  description: 'Manage your sessions, patients, and notes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen antialiased">{children}</body>
    </html>
  );
}
