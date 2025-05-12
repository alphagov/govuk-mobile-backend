import { createHandler } from "./app";
import { validateAttestationHeaderOrThrow } from "./attestation";
import { FEATURE_FLAGS } from "./feature-flags";
import { proxy } from './proxy';

const attestationUseCase = {
    validateAttestationHeaderOrThrow
}

const dependencies = {
    proxy,
    attestationUseCase,
    featureFlags: FEATURE_FLAGS
}

export const lambdaHandler = createHandler(dependencies);
