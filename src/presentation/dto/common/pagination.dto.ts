import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDTO {
  @ApiProperty({ description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: string }) => parseInt(value))
  page: number = 1;

  @ApiProperty({ description: 'Limit of items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }: { value: string }) => parseInt(value))
  limit: number = 10;
}
