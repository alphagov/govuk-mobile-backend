import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAppCheck, AppCheck } from 'firebase-admin/app-check';

export class AttestationDriver {
  private readonly appCheck: AppCheck;

  constructor() {
    initializeApp({
      credential: applicationDefault(),
    });
    this.appCheck = getAppCheck();
  }

  getToken = async (appId: string) => {
    return this.appCheck.createToken(appId);
  };
}
