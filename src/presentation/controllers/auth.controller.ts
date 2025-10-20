import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Post } from '@nestjs/common';

import {
  AUTH_LOGIN_RATE_LIMIT,
  AUTH_REFRESH_RATE_LIMIT,
} from 'src/domain/consts';
import { LoginUseCase, RefreshTokenUseCase } from 'src/application/use-cases';
import { LoginDTO, RefreshTokenDTO } from '../dto';
import { RateLimit } from '../decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @ApiOperation({
    summary: 'Login user.',
  })
  @Post('login')
  @RateLimit(AUTH_LOGIN_RATE_LIMIT)
  async login(@Body() data: LoginDTO) {
    return this.loginUseCase.execute(data.email, data.password);
  }

  @ApiOperation({
    summary: 'Refresh token user.',
  })
  @Post('refresh-token')
  @RateLimit(AUTH_REFRESH_RATE_LIMIT)
  refreshToken(@Body() data: RefreshTokenDTO) {
    return this.refreshTokenUseCase.execute(data.refreshToken);
  }
}
