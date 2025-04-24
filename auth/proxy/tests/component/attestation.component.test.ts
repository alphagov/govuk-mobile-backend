import "dotenv/config"
import { describe, expect, it, beforeAll } from "vitest";
import { validateAttestationHeaderOrThrow } from "../../attestation";
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAppCheck } from "firebase-admin/app-check";
import jwt from "jsonwebtoken";

describe('attestation', () => {
    const appId = process.env.ATTESTATION_APP_ID as string;

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