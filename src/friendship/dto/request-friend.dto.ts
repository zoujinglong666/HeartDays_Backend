// src/friendship/dto/request-friend.dto.ts
import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class RequestFriendDto {
  @IsOptional()
  @IsUUID()
  friendId: string;
}