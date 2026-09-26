import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Multi-Persona Code Reviewer</title>
        <meta
          name="description"
          content="AI-powered code review with Security, Performance, and Architecture personas."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
