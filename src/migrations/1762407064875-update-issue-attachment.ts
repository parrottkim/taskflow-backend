import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateIssueAttachment1762407064875 implements MigrationInterface {
  name = 'UpdateIssueAttachment1762407064875';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" RENAME COLUMN "name" TO "filename"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" RENAME COLUMN "url" TO "path"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" RENAME COLUMN "path" TO "url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" RENAME COLUMN "filename" TO "name"`,
    );
  }
}
