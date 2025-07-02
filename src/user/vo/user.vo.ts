// user.vo.ts
import { Expose } from 'class-transformer';

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
}
