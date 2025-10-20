import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

const isTestEnvironment = process.env.ENV === 'test';

dotenvConfig({ path: isTestEnvironment ? '.env.test' : '.env' });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.P1_POSTGRES_HOST,
  port: Number(process.env.P1_POSTGRES_PORT || '5432'),
  username: process.env.P1_POSTGRES_USER,
  password: process.env.P1_POSTGRES_PASS,
  database: process.env.P1_POSTGRES_DB,
  entities: [`${__dirname}/../src/infra/database/models/*.model.{js,ts}`],
  migrations: [`${__dirname}/migrations/**/*.{js,ts}`],
  seeds: [`${__dirname}/seeds/**/*.ts`],
  factories: [`${__dirname}/factories/**/*.ts`],
} as DataSourceOptions & SeederOptions);

export default dataSource;
