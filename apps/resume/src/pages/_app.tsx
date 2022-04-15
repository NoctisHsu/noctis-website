import { AppProps } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";
import { NextUIProvider } from "@nextui-org/react";
import { darkTheme } from "core";
import { authorName } from "core/constants";
import { KBarProvider } from "kbar";

import ContactButton from "../components/ContactButton";
import generateKbarAction from "../constants/KbarActions";

const KbarComponent = dynamic(() => import("core/components/Kbar"), {
  ssr: false,
});

export default function ResumeApp({ Component, pageProps }: AppProps) {
  return (
    <NextUIProvider theme={darkTheme}>
      <KBarProvider actions={generateKbarAction()}>
        <Title />
        <KbarComponent />
        <ContactButton />
        <Component {...pageProps} />
      </KBarProvider>
    </NextUIProvider>
  );
}

function Title() {
  return (
    <Head>
      <title>{`${authorName} resume`}</title>
    </Head>
  );
}
