// src/friendship/friendship.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
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
  async requestFriend(@Request() req, @Body() dto: RequestFriendDto) {
    return this.friendshipService.requestFriend(req.user.id, dto.friendId);
  }

  @Post('respond')
  async respondFriendRequest(@Body() dto: RespondFriendRequestDto) {
    return this.friendshipService.respondFriendRequest(
      dto.requestId,
      dto.action,
    );
  }

  @Get('list')
  async getFriendList(@Request() req) {
    return this.friendshipService.getFriendList(req.user.id);
  }
}
