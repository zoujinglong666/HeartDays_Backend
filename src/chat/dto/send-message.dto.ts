import { IsString, IsUUID, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  type?: string; // text/image/file



  @IsUUID()
  receiverId: string;

} 