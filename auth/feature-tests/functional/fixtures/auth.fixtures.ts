export const AuthFixtures = {
    valid: {
        username: 'test@test.com',
        password: 'Admin123!', // pragma: allowlist-secret 
        attestationToken: ''
    },
    invalid: {
        username: 'invalid',
        password: 'madeup', // pragma: allowlist-secret 
        attestationToken: ''
    }
}