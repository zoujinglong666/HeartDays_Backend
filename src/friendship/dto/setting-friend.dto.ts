import {  IsOptional, IsUUID } from 'class-validator';

export class SettingFriendDto {
  @IsOptional()
  @IsUUID()
  friendId: string;


  @IsOptional()
  friendNickname: string;

}