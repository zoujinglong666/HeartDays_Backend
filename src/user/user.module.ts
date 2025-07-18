import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Module } from '@nestjs/common';
import { FriendshipModule } from '../friendship/friendship.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), FriendshipModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Only needed if another module needs UserService
})
export class UserModule {}
