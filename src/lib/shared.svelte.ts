export const appState = $state<{ error: null | Error; loading: boolean }>({
  error: null,
  loading: false,
});

export const tryAsync = async (fn: () => Promise<void>) => {
  appState.error = null;
  appState.loading = true;
  await fn().catch((err) => {
    console.error(err);
    if (err instanceof Error) {
      console.error(err.cause);
      appState.error = err;
    } else {
      appState.error = Error("Unknown error", { cause: err });
    }
  });
  appState.loading = false;
};
