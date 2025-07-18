import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('chat_session_settings')
@Unique(['userId', 'sessionId'])
export class ChatSessionSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isMuted: boolean;

  @CreateDateColumn()
  updatedAt: Date;
} 