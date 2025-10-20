import * as argon2 from 'argon2';
import { setSeederFactory } from 'typeorm-extension';

import { UserModel } from 'src/infra/database/models/user.model';

export default setSeederFactory(UserModel, async (faker) => {
  const user = new UserModel();
  const hashedPassword = await argon2.hash('123456');

  user.name = faker.person.fullName();
  user.email = faker.internet
    .email({ allowSpecialCharacters: false })
    .toLocaleLowerCase();
  user.password = hashedPassword;

  return user;
});
