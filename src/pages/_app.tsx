import type { AppProps } from 'next/app';
import { NotificationProvider } from '@/contexts/NotificationContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NotificationProvider>
      <Component {...pageProps} />
    </NotificationProvider>
  );
}

