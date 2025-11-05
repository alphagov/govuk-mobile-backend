import { StatusCodes, ReasonPhrases } from 'http-status-codes';

/**
 * Shared mapping of status codes to reason phrases
 */
const statusToPhraseMap: Record<number, string> = {
  [StatusCodes.OK]: ReasonPhrases.OK,
  [StatusCodes.CREATED]: ReasonPhrases.CREATED,
  [StatusCodes.ACCEPTED]: ReasonPhrases.ACCEPTED,
  [StatusCodes.NO_CONTENT]: ReasonPhrases.NO_CONTENT,
  [StatusCodes.BAD_REQUEST]: ReasonPhrases.BAD_REQUEST,
  [StatusCodes.UNAUTHORIZED]: ReasonPhrases.UNAUTHORIZED,
  [StatusCodes.FORBIDDEN]: ReasonPhrases.FORBIDDEN,
  [StatusCodes.NOT_FOUND]: ReasonPhrases.NOT_FOUND,
  [StatusCodes.INTERNAL_SERVER_ERROR]: ReasonPhrases.INTERNAL_SERVER_ERROR,
  [StatusCodes.SERVICE_UNAVAILABLE]: ReasonPhrases.SERVICE_UNAVAILABLE,
};

/**
 * Gets the standard reason phrase for a given status code
 * @param statusCode - HTTP status code
 * @returns Reason phrase string
 */
function getReasonPhrase(statusCode: number): string {
  const minHttpStatus = 100;
  const maxHttpStatus = 999;

  if (
    !Number.isInteger(statusCode) ||
    statusCode < minHttpStatus ||
    statusCode > maxHttpStatus
  ) {
    return 'Unknown Status';
  }
  const phrase = statusToPhraseMap[statusCode];
  return phrase ?? 'Unknown Status';
}

export { getReasonPhrase };
