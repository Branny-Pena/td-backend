import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateImageDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsUUID()
  @IsNotEmpty()
  returnStateId: string;
}
