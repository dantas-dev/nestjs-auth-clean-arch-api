export interface IConnection {
  isHealthy(): Promise<boolean>;
}
