import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isNative } from '@/lib/native/platform';
import { watchSystemTheme } from '@/lib/theme';
import '@fontsource/barlow-condensed/latin-500.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@/styles/globals.css';
import { SpotProvider } from '@/lib/SpotContext';
import { LangProvider } from '@/lib/i18n/LangContext';
import { Onboarding } from '@/components/Onboarding';
import { GlobalAlarm } from '@/components/nav/GlobalAlarm';
import { brandIconSvg } from '@/lib/brand';

const icon = 'data:image/svg+xml,' + encodeURIComponent(brandIconSvg());

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  useEffect(() => watchSystemTheme(), []);
  // Android app: pages are bundled in the APK, and a reload of e.g. /navigate is served
  // the home page file. Open the page the address asks for.
  useEffect(() => {
    if (!isNative() || router.pathname !== '/') return;
    const path = location.pathname.replace(/\/+$/, '').replace(/\.html$/, '');
    if (path && path !== '/' && path !== '/index') router.replace(path + location.search);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Offline app shell (see public/sw.js). Production only, so development is never stale.
  // Not in the Android app: its pages are already on the phone, and a cache could keep old versions after an update.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || isNative() || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not critical */ });
  }, []);
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
          <GlobalAlarm />
        </SpotProvider>
      </LangProvider>
    </>
  );
}
