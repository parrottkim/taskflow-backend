import { IssueAttachment } from '@/entity/issue/issue-attachment.entity';
import { SftpService } from '@/sftp/sftp.service';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
} from 'typeorm';

@EventSubscriber()
export class IssueAttachmentSubscriber implements EntitySubscriberInterface<IssueAttachment> {
  constructor(
    dataSource: DataSource,
    private readonly sftpService: SftpService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return IssueAttachment;
  }

  async beforeRemove(event: RemoveEvent<IssueAttachment>) {
    if (event.entity?.path) {
      await this.sftpService.deleteFileByPath(event.entity.path);
    }
  }
}
