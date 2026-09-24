import { Html, Head, Main, NextScript } from 'next/document';

// Sets language and text direction before the first paint so Arabic users
// never see a flash of the left-to-right layout.
const setDir = `try{var s=localStorage.getItem('bahrna:lang');var l=s?JSON.parse(s):(/^ar\\b/i.test(navigator.language)?'ar':'en');if(l==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl';}}catch(e){}`;

export default function Document() {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: setDir }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
