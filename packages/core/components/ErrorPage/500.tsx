import { ErrorTemplate } from "./Template";

export function ServerError() {
  return (
    <ErrorTemplate
      errorTitle="500"
      paragraph="Something wrong."
      anchorMessage="Go to main"
    />
  );
}
