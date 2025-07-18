import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { User } from '../../user/user.entity';
import { ChatMessageRead } from './chat-message-read.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20, default: 'text' })
  type: string; // text/image/file

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'sent' })
  status: string; // sent/read/withdraw

  @ManyToOne(() => ChatSession, session => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: ChatSession;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @OneToMany(() => ChatMessageRead, read => read.message)
  reads: ChatMessageRead[];
} 