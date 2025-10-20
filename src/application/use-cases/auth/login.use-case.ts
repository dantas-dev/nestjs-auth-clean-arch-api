import { UnauthorizedException } from 'src/domain/exceptions';
import type { ITokenService, IHashService } from 'src/domain/services';
import type { IUserRepository } from 'src/domain/repositories/user-repository.interface';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.hashService.compare(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      accessToken: this.tokenService.sign({ ...payload, type: 'access' }),
      refreshToken: this.tokenService.signRefresh({
        ...payload,
        type: 'refresh',
      }),
    };
  }
}
