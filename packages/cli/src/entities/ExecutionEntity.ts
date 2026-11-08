import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowEntity } from './WorkflowEntity';
import { UserEntity } from './UserEntity';
import { ExecutionMode, ExecutionStatus, IRunExecutionData } from '../types';

@Entity('execution_entity')
export class ExecutionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'workflow_id' })
  workflowId: string;

  @Column({
    type: 'enum',
    enum: ExecutionMode,
    default: ExecutionMode.MANUAL,
  })
  mode: ExecutionMode;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.RUNNING,
  })
  status: ExecutionStatus;

  @Column({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'finished_at', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'json', nullable: true })
  data: IRunExecutionData | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => WorkflowEntity, (workflow) => workflow.executions)
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowEntity;

  @ManyToOne(() => UserEntity, (user) => user.executions, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;
}
