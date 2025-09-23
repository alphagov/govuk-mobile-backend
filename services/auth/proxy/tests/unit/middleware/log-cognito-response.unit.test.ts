import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MiddlewareObj, Request } from '@middy/core';
import { logCognitoResponseMiddleware } from '../../../middleware/log-cognito-response';
import * as loggerModule from '../../../logger';

// Helper to run the after phase
async function runAfter(mw: MiddlewareObj, response: unknown): Promise<void> {
  const request = { response } as unknown as Request;
  await mw.after?.(request);
}

describe('logCognitoResponseMiddleware', () => {
  const warnSpy = vi.spyOn(loggerModule.logger, 'warn');

  beforeEach(() => {
    warnSpy.mockReset();
  });

  it('does nothing for 2xx responses', async () => {
    await runAfter(logCognitoResponseMiddleware, {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'redacted' }),
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does nothing for empty response', async () => {
    await runAfter(logCognitoResponseMiddleware, undefined);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs for 4xx with json error body', async () => {
    await runAfter(logCognitoResponseMiddleware, {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'bad code',
      }),
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message, details] = warnSpy.mock.calls[0];
    expect(message).toBe('COGNITO_ERROR');
    expect(details).toMatchObject({ statusCode: 400 });
  });

  it('logs for 5xx with non-json body', async () => {
    await runAfter(logCognitoResponseMiddleware, {
      statusCode: 500,
      headers: { 'content-type': 'text/plain' },
      body: '<html>oops</html>',
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message, details] = warnSpy.mock.calls[0];
    expect(message).toBe('COGNITO_ERROR');
    expect(details).toMatchObject({ statusCode: 500 });
  });

  it('does nothing if response shape is unexpected', async () => {
    await runAfter(logCognitoResponseMiddleware, 'not-an-object');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
