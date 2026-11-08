import { injectable } from 'tsyringe';
import { Repository, DataSource } from 'typeorm';
import { WebhookEntity } from '../entities';

@injectable()
export class WebhookRepository extends Repository<WebhookEntity> {
  constructor(dataSource: DataSource) {
    super(WebhookEntity, dataSource.manager);
  }

  /**
   * Find webhook by path and method
   */
  async findByPathAndMethod(path: string, method: string): Promise<WebhookEntity | null> {
    return this.findOne({
      where: {
        webhookPath: path,
        httpMethod: method.toUpperCase(),
        active: true,
      },
    });
  }

  /**
   * Find webhooks by workflow ID
   */
  async findByWorkflowId(workflowId: string): Promise<WebhookEntity[]> {
    return this.find({
      where: { workflowId },
    });
  }

  /**
   * Find all active webhooks
   */
  async findActive(): Promise<WebhookEntity[]> {
    return this.find({
      where: { active: true },
    });
  }

  /**
   * Deactivate webhooks for workflow
   */
  async deactivateForWorkflow(workflowId: string): Promise<void> {
    await this.update({ workflowId }, { active: false });
  }

  /**
   * Activate webhooks for workflow
   */
  async activateForWorkflow(workflowId: string): Promise<void> {
    await this.update({ workflowId }, { active: true });
  }
}
