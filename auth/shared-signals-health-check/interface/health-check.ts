export interface SharedSignalsHealthCheck {
  authorise(): Promise<string>;
  verify(token: string): Promise<boolean>;
}
