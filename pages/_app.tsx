import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { watchSystemTheme } from '@/lib/theme';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@/styles/globals.css';
import { SpotProvider } from '@/lib/SpotContext';
import { LangProvider } from '@/lib/i18n/LangContext';
import { Onboarding } from '@/components/Onboarding';

const icon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2306283D'/%3E%3Cpath d='M8 38c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5' stroke='%237FD4D0' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3Cpath d='M8 48c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5' stroke='%23e0f2fe' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='44' cy='24' r='5' fill='%23FF6B35'/%3E%3C/svg%3E";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => watchSystemTheme(), []);
  return (
    <>
      <Head>
        <title>Bahrna · بحرنا — your smart companion at sea</title>
        <meta name="description" content="Tides, wind, waves, weather and fishing windows for UAE waters. المد والجزر والرياح والأمواج وأوقات الصيد في مياه الإمارات." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#F3F6F7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#041B2A" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bahrna" />
        <link rel="icon" href={icon} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <LangProvider>
        <SpotProvider>
          <Component {...pageProps} />
          <Onboarding />
        </SpotProvider>
      </LangProvider>
    </>
  );
}
