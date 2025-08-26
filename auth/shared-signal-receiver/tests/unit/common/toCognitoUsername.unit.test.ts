import { toCognitoUsername } from '../../../common/toCognitoUsername';
import { describe, it, expect } from 'vitest';

describe('toCognitoUsername', () => {
  it("should prefix the username with 'onelogin_'", () => {
    const username = 'testuser';
    const expectedCognitoUsername = 'onelogin_testuser';
    expect(toCognitoUsername(username)).toBe(expectedCognitoUsername);
  });
});
