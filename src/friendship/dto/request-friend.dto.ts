// src/friendship/dto/request-friend.dto.ts
import { IsNumber } from 'class-validator';

export class RequestFriendDto {
  @IsNumber()
  friendId: number;
}