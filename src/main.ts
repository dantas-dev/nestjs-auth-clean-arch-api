import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './presentation/filters/all-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades que não tem decorator de validação (ex: @IsString()) do DTO
      forbidNonWhitelisted: true, // Retorna erro se tiver propriedades que não tem decorator de validação no DTO
      transform: true, // Transforma os tipos dos dados de acordo com os tipos definidos no DTO (ex: string para number)
      transformOptions: {
        enableImplicitConversion: true, // Permite a transformação de tipos mesmo sem usar @Type() do class-transformer (ex: string para number)
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Ativa @Exclude() nas entities globalmente. Sem isso, campos como password e deletedAt voltam no response.
  // Precisa ser registrado ANTES do app.listen().
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Nest Auth API')
    .setDescription('Documentação da API')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
