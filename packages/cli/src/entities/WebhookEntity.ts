import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('webhook_entity')
export class WebhookEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'workflow_id' })
  workflowId: string;

  @Column({ name: 'webhook_path', length: 500 })
  webhookPath: string;

  @Column({ name: 'http_method', length: 10 })
  httpMethod: string;

  @Column({ length: 100 })
  node: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
