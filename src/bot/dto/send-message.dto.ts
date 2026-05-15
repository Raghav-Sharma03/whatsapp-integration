import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'user_phone is required' })
  @Matches(/^[0-9]{7,15}$/, {
    message: 'user_phone must be 7–15 digits with no spaces or symbols',
  })
  user_phone: string;

  @IsString()
  @IsNotEmpty({ message: 'message cannot be empty' })
  @MaxLength(500, { message: 'message cannot exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message: string;
}