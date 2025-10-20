import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';

import { USERS_QTD } from 'database/factories/utils';
import { UserModel } from 'src/infra/database/models/user.model';

const TABLE_NAME = 'users';

export class UserSeeder implements Seeder {
  // false = roda toda vez que chamar seed:run. true = registra execucao e nao repete.
  track = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<any> {
    await dataSource.query(`DELETE FROM ${TABLE_NAME};`);

    const repository = dataSource.getRepository(UserModel);

    const userAdmin = new UserModel();
    const hashedPassword = await argon2.hash('123456');

    userAdmin.name = 'Admin';
    userAdmin.email = 'admin@nestapp.com';
    userAdmin.password = hashedPassword;
    await repository.save(userAdmin);

    const userFactory = factoryManager.get(UserModel);
    await userFactory.saveMany(USERS_QTD);
  }
}
