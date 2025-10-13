import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAppCheck, AppCheck } from 'firebase-admin/app-check';
import { getClientSecret } from '../common/secrets';
import { testConfig } from '../common/config';

export class AttestationDriver {
  private appCheck: AppCheck;
  private app: App | null;

  constructor() {}

  getToken = async (appId: string) => {
    if (!testConfig.attestationEnabled) {
      console.warn('Attestation is not enabled in this environment.');
      return {
        token: 'empty',
      };
    }

    if (!this.app) {
      throw new Error('Firebase app is not initialized. Call build() first.');
    }
    return this.appCheck.createToken(appId);
  };

  async build() {
    if (this.app) {
      return;
    }
    const serviceAccount = await getClientSecret(
      `/${testConfig.configStackName}/firebase/service-account`,
    );

    const serviceAccountKey = JSON.parse(serviceAccount);

    this.app = initializeApp({
      credential: cert(serviceAccountKey),
    });

    this.appCheck = getAppCheck();
  }
}
