// user.vo.ts
import { Expose } from 'class-transformer';
import { Gender } from '../../enums/genderEnum';

export class UserVO {
  @Expose()
  id: number;

  @Expose()
  userAccount: string;

  @Expose()
  nickname?: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  email?: string;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;


  @Expose()
  gender?: Gender;
}
