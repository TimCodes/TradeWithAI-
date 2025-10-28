import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  provider: string; // 'kraken', 'claude', 'openai', etc.

  @Column()
  keyName: string;

  @Column()
  encryptedKey: string;

  @Column({ nullable: true })
  encryptedSecret: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, user => user.apiKeys)
  @JoinColumn({ name: 'userId' })
  user: User;
}