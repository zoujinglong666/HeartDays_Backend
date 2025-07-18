import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ChatSessionMember } from './chat-session-member.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  type: 'single' | 'group';

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ChatSessionMember, member => member.session)
  members: ChatSessionMember[];

  @OneToMany(() => ChatMessage, message => message.session)
  messages: ChatMessage[];
} 