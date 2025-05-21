export interface FeatureFlags {
    ATTESTATION: boolean;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const FEATURE_FLAGS: FeatureFlags = {
    ATTESTATION: process.env["ENABLE_ATTESTATION"] === 'true',
}