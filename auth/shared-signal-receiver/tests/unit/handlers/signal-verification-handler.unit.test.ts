import { describe, expect, it } from 'vitest';
import { handleSignalVerification } from '../../../handlers/signal-verification-handler';

describe('handleSignalVerification', () => {
  it('should return 202 Accepted', async () => {
    const response = await handleSignalVerification();

    // Assert
    expect(response).toEqual({
      statusCode: 202,
      body: JSON.stringify({ message: 'Accepted' }),
      headers: { 'Content-Type': 'application/json' },
    });
  });
});
