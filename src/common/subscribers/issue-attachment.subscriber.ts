import { IssueAttachment } from 'src/entity/issue/issue-attachment.entity';
import { SftpService } from 'src/sftp/sftp.service';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
} from 'typeorm';

@EventSubscriber()
export class IssueAttachmentSubscriber
  implements EntitySubscriberInterface<IssueAttachment>
{
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
    if (event.entity?.url) {
      await this.sftpService.deleteFile(event.entity.url);
    }
  }
}
