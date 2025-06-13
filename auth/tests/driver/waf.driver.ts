export const repeatedlyRequestEndpoint = async (
  numRequests: number,
  requestFn: () => Promise<number>,
): Promise<number[]> => {
  return Promise.all(
    Array.from({ length: numRequests }, async () => await requestFn())
  )
};