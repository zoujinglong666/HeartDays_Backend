// src/friendship/dto/respond-friend-request.dto.ts
import { IsNumber, IsIn } from 'class-validator';

export class RespondFriendRequestDto {
  @IsNumber()
  requestId: number;

  @IsIn(['accept', 'reject'])
  action: 'accept' | 'reject';
}