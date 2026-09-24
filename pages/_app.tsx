import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';

const icon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230c4a6e'/%3E%3Cpath d='M8 38c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5' stroke='%237dd3fc' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3Cpath d='M8 48c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5' stroke='%23e0f2fe' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Bahrna · بحرنا — UAE tides &amp; sea</title>
        <meta name="description" content="Live tides, wind, waves and fishing outlook for UAE waters." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0c4a6e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bahrna" />
        <link rel="icon" href={icon} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
