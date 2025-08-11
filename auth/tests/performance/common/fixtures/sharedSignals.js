export const SHARED_SIGNALS_CREDENTIAL_CHANGE_USERS = () =>
  Array.from({ length: 100 }, (_, i) => `perf-test-email${i}@test.com`);

export const SHARED_SIGNALS_ACCOUNT_PURGE_USERS = () =>
  Array.from({ length: 100 }, (_, i) => `perf-test-purge${i}@test.com`);
