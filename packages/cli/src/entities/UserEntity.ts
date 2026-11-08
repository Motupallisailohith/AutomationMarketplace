import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserRole } from '../types';
import { WorkflowEntity } from './WorkflowEntity';
import { ExecutionEntity } from './ExecutionEntity';
import { CredentialsEntity } from './CredentialsEntity';

@Entity('user_entity')
export class UserEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ name: 'first_name', nullable: true, length: 100 })
  firstName: string | null;

  @Column({ name: 'last_name', nullable: true, length: 100 })
  lastName: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => WorkflowEntity, (workflow) => workflow.user)
  workflows: WorkflowEntity[];

  @OneToMany(() => ExecutionEntity, (execution) => execution.user)
  executions: ExecutionEntity[];

  @OneToMany(() => CredentialsEntity, (credential) => credential.user)
  credentials: CredentialsEntity[];
}
