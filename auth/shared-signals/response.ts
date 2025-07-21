export const generateResponse = (
  status: number,
  message: string
): {
  statusCode: number;
  headers: {
    "Content-Type": string;
  };
  body: string;
} => {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message,
    }),
  };
};
