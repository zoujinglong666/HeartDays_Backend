// src/friendship/friendship.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm';

@Entity('friendships')
@Unique(['user_id', 'friend_id'])
export class Friendship {
  @Column({ type: 'uuid' })
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @Column({ type: 'uuid' })
  @Index()
  friend_id: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;


  @Column({ type: 'varchar', length: 50, nullable: true })
  friend_nickname: string;

}