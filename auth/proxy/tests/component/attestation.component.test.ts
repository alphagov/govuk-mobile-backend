import "dotenv/config"
import { beforeAll, describe, expect, it } from "vitest";
import { validateAttestationHeaderOrThrow } from "../../attestation";
import { getAppCheck } from "firebase-admin/app-check";
import jwt from "jsonwebtoken";
import { initializeApp, applicationDefault } from "firebase-admin/app";

describe('attestation', () => {
    const appId = process.env.ATTESTATION_APP_ID as string;

    beforeAll(() => {
        initializeApp({
            credential: applicationDefault()
        })
    })

    it('should return void for valid attesation checks', async () => {
        const jwt = await getAppCheck().createToken(appId)

        await expect(validateAttestationHeaderOrThrow({
            'Attestation-Token': jwt.token
        }, '/token')).resolves.not.toThrow()
    })

    it('should reject invalid attestation tokens', async () => {
        const token = jwt.sign({ foo: 'bar' }, 'shhhhh');

        await expect(validateAttestationHeaderOrThrow({
            'Attestation-Token': token
        }, '/token')).rejects.toThrow()
    })
})