import { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { NextUIProvider } from "@nextui-org/react";
import { darkTheme } from "core";
import { KBarProvider, useRegisterActions } from "kbar";

import generateKbarAction from "../constants/KbarActions";

const KbarComponent = dynamic(() => import("core/components/Kbar"), {
  ssr: false,
});

export default function BlogApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const kbarActions = generateKbarAction(router);

  return (
    <NextUIProvider theme={darkTheme}>
      <KBarProvider actions={kbarActions}>
        <HandleActionWithRoute />
        <KbarComponent />
        <Component {...pageProps} />
      </KBarProvider>
    </NextUIProvider>
  );
}

function HandleActionWithRoute() {
  const router = useRouter();
  const homeAction = {
    id: "home",
    name: "Home",
    section: "Scope",
    perform: () => {
      router.push("/");
    },
  };
  useRegisterActions(router.pathname !== "/" ? [homeAction] : [], [
    router.pathname,
  ]);
  return <></>;
}
