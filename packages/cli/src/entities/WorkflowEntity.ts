import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { UserEntity } from './UserEntity';
import { ExecutionEntity } from './ExecutionEntity';
import { INode, IConnections, IWorkflowSettings } from '../types';

@Entity('workflow_entity')
export class WorkflowEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @Column({ type: 'json' })
  nodes: INode[];

  @Column({ type: 'json' })
  connections: IConnections;

  @Column({ type: 'json', nullable: true })
  settings: IWorkflowSettings | null;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => UserEntity, (user) => user.workflows)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => ExecutionEntity, (execution) => execution.workflow)
  executions: ExecutionEntity[];
}
