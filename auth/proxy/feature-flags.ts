export interface FeatureFlags {
    ATTESTATION: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
    ATTESTATION: process.env["ENABLE_ATTESTATION"] === 'true',
}