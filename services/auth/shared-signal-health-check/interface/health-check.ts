export interface SharedSignalHealthCheck {
  authorise(): Promise<string>;
  verify(token: string): Promise<boolean>;
}
