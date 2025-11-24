import { ReportAttachment } from 'src/entity/report/report-attachment.entity';
import { SftpService } from 'src/sftp/sftp.service';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
} from 'typeorm';

@EventSubscriber()
export class ReportAttachmentSubscriber
  implements EntitySubscriberInterface<ReportAttachment>
{
  constructor(
    dataSource: DataSource,
    private readonly sftpService: SftpService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return ReportAttachment;
  }

  async beforeRemove(event: RemoveEvent<ReportAttachment>) {
    if (event.entity?.path) {
      await this.sftpService.deleteFileByPath(event.entity.path);
    }
  }
}
