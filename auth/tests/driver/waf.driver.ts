export const repeatedlyRequestEndpoint = async (
  numRequests: number,
  requestFn: () => Promise<{
    status: number
  }>,
  responseCodes: number[],
  delayMs = 1
): Promise<void> => {
  for (let i = 0; i < numRequests; i++) {
    try {
      const response = await requestFn();
      responseCodes.push(response.status);
    } catch (e) {
      responseCodes.push(e.response.status);
    }

    // escape early
    if (responseCodes.includes(429)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
};