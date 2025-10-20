import { DataSource } from 'typeorm';

import { IConnection } from 'src/domain/services';

export class TypeOrmConnection implements IConnection {
  constructor(private readonly dataSource: DataSource) {}

  async isHealthy(): Promise<boolean> {
    await this.dataSource.query('SELECT 1');
    return true;
  }
}
