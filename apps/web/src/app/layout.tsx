import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { AuthenticatedApiProvider, DevelopmentApiProvider } from '@/components/kepler/api-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kepler',
  description: 'Your personal agent platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? <ClerkProvider><AuthenticatedApiProvider>{children}</AuthenticatedApiProvider></ClerkProvider>
    : <DevelopmentApiProvider>{children}</DevelopmentApiProvider>;
  return (
    <html lang="en" className="dark">
      <body>{content}</body>
    </html>
  );
}
