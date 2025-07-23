// src/friendship/friendship.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { RequestFriendDto } from './dto/request-friend.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('friends')
@UseGuards(AuthGuard('jwt'))
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('request')
  async requestFriend(@Body() dto: RequestFriendDto) {
    return this.friendshipService.requestFriend( dto.friendId);
  }

  @Post('respond')
  async respondFriendRequest(@Body() dto: RespondFriendRequestDto) {
    return this.friendshipService.respondFriendRequest(
      dto.requestId,
      dto.action,
    );
  }

  @Get('list')
  async getFriendList() {
    return this.friendshipService.getFriendList();
  }

  
  @Get('requests/received')
  async getReceivedFriendRequests() {
    return this.friendshipService.getReceivedFriendRequests();
  }
}
