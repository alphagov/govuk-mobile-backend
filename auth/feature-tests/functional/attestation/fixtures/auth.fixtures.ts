export const AuthFixtures = {
    valid: {
        username: process.env.DEV_TEST_USERNAME,
        password: process.env.DEV_TEST_PASSWORD,
        attestationToken: 'foo-bar'
    },
    invalid: {
        username: 'invalid',
        password: '',
        attestationToken: ''
    }
}