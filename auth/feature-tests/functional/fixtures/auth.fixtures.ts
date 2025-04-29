export const AuthFixtures = {
    valid: {
        username: 'test@test.com',
        password: 'Admin123!', // pragma: allowlist-secret 
        attestationToken: "placeholder" // pragma: allowlist-secret 
    },
    invalid: {
        username: 'invalid',
        password: 'madeup', // pragma: allowlist-secret 
        attestationToken: 'foobar'
    },
    missing: {
        username: '',
        password: '', // pragma: allowlist-secret 
        attestationToken: ''
    },
    expired: {
        username: '',
        password: '', // pragma: allowlist-secret 
        // expired JWT
        attestationToken: 'eyJraWQiOiJEX28wMGciLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjI5OTE5NjM2OTk3OTppb3M6ZDExODUyMzkyN2UxODFjMWUzZTAxZSIsImF1ZCI6WyJwcm9qZWN0c1wvMjk5MTk2MzY5OTc5IiwicHJvamVjdHNcL2dvdnVrLWFwcCJdLCJwcm92aWRlciI6ImN1c3RvbSIsImlzcyI6Imh0dHBzOlwvXC9maXJlYmFzZWFwcGNoZWNrLmdvb2dsZWFwaXMuY29tXC8yOTkxOTYzNjk5NzkiLCJleHAiOjE3NDU4NTgxNzcsImlhdCI6MTc0NTg1NDU3NywianRpIjoieDJON1JjdVZGUkFoVzFNUUI3ZFM2Y2lsdmhpd19PeWhpSVFZdkdOb3ZrWSJ9.Dod8We-byeW6j0QA9qM54fjURTtVdB86Mglt7h1D4_uMbs-3DrYTJoFVlZh4hagDj3Oo2udFi7ZsP3yREl8fnyiBpRsVZcAUoe28_d9Qex0niibkhO2tYRu8aWwIGEUlZUuJRK8Xm-OgCtRDICb_QRNtPkR1jPesqM5xSViW8M59-jc1YB0Z1zg-Igt0eglpeWHbF-BFZTLQiaHd6DVpUSzlW6eJdyRLyV6K9mcSi5-AViHaaC0zHiF8Mt6SzLVBvwnezX1Tn8LRgDmzIWVT7ir8F9oRtNPYyxUyCGtD-JWEU0zA9MUtQwWJORsmVcEnI2RM6hwiQHAJQoJPOapQC89JHtPGAH2x6E02J4pewWR2FzbAVBUxOPyaLhgNiHwzhIWsD524Uh_4EtMBcpE-9TBW9XyiYBByRm1QY9ni4x3TC_K39xQx-76WI37C0pKQgGMhtRhCRWE8A5Tv6wUJtoOBYgP32PjRhLbn9xLc9mr2u5_NUN2MBN1aG8Yx6oNd' // pragma: allowlist-secret 
    }
}