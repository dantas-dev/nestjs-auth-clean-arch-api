import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  FindUserUseCase,
  CreateUserUseCase,
  UpdateUserUseCase,
  DeleteUserUseCase,
  FindAllUserUseCase,
} from 'src/application/use-cases';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UserPresenter } from '../presenters';
import { CurrentUser, RateLimit } from '../decorators';
import { JWTAuthGuard } from '../guards/jwt-auth.guard';
import { CreateUserDTO, UpdateUserDTO } from '../dto/user';
import { PaginationDTO } from '../dto/common/pagination.dto';
import { AUTH_REGISTER_RATE_LIMIT } from 'src/domain/consts';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly findUserUseCase: FindUserUseCase,
    private readonly findAllUserUseCase: FindAllUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @ApiOperation({
    summary: 'Create an user.',
  })
  @Post()
  @RateLimit(AUTH_REGISTER_RATE_LIMIT)
  async create(@Body() data: CreateUserDTO) {
    const user = await this.createUserUseCase.execute(data);
    return UserPresenter.toHTTP(user);
  }

  @ApiOperation({
    summary: 'Get me.',
  })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JWTAuthGuard)
  async me(@CurrentUser('sub') userId: number) {
    const user = await this.findUserUseCase.execute(userId);
    return UserPresenter.toHTTP(user);
  }

  @ApiOperation({
    summary: 'Find all users.',
  })
  @ApiBearerAuth()
  @Get()
  @UseGuards(JWTAuthGuard)
  async findAll(@Query() query: PaginationDTO) {
    const result = await this.findAllUserUseCase.execute(
      query.page,
      query.limit,
    );
    return {
      ...result,
      data: UserPresenter.toHTTPMany(result.data),
    };
  }

  @ApiOperation({
    summary: 'Find one user.',
  })
  @ApiBearerAuth()
  @Get(':id')
  @UseGuards(JWTAuthGuard)
  async findOne(@Param('id') userId: number) {
    const user = await this.findUserUseCase.execute(userId);
    return UserPresenter.toHTTP(user);
  }

  @ApiOperation({
    summary: 'Update an user.',
  })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JWTAuthGuard)
  async update(@Param('id') userId: number, @Body() data: UpdateUserDTO) {
    const user = await this.updateUserUseCase.execute(userId, data);
    return UserPresenter.toHTTP(user);
  }

  @ApiOperation({
    summary: 'Delete an user.',
  })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JWTAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') userId: number) {
    return this.deleteUserUseCase.execute(userId);
  }
}
