import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anniversary } from './anniversary.entity';
import { AnniversaryService } from './anniversary.service';
import { AnniversaryController } from './anniversary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Anniversary])],
  providers: [AnniversaryService],
  controllers: [AnniversaryController],
  exports: [AnniversaryService],
})
export class AnniversaryModule {} 