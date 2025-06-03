

import type { APIGatewayProxyEventHeaders } from "aws-lambda";
import { z } from "zod/v4";

const maxHeaderValueLength = 1024; // adjust as appropriate

// eslint-disable-next-line no-control-regex, sonarjs/no-control-regex
const asciiString = z.string().regex(/^[\x00-\x7F]*$/, { message: "Non-ASCII character found" });

const headerSchema = z.object({
    'content-type': z.enum([
        "application/x-www-form-urlencoded",
        "application/json"
    ]),
    'x-attestation-token': asciiString, 
    'accept': asciiString
        .max(maxHeaderValueLength)
        .optional()
        .describe("Client's preferred response format from Cognito."),
    'user-agent': asciiString
        .max(maxHeaderValueLength)
        .optional()
        .describe("Identifies the client or proxy software making the request."),
    // 'host': asciiString.optional(),
    'connection': z
        .enum([
            'keep-alive', // for persistent connections
            'close' // close connection after request
        ])
        .optional()
}) // by default, any unrecognized keys in the input object will be automatically stripped from the parsed result

export type SanitizedRequestHeaders = z.infer<typeof headerSchema>;

export const sanitizeHeaders = async (headers: APIGatewayProxyEventHeaders): Promise<SanitizedRequestHeaders> => {
    const normalizedHeaders = Object.entries(headers)
        .reduce<Record<string, string>>((acc, [key, value]) => {
            if (typeof value === 'string') {
                acc[key.toLowerCase()] = value;
            }
            return acc;
        }, {});

    return headerSchema
        .parseAsync(normalizedHeaders)
}