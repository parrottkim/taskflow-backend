import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateIssueCategory1763011881429 implements MigrationInterface {
  name = 'UpdateIssueCategory1763011881429';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issue_category" ADD "sequence" integer NOT NULL default 10`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issue_category" DROP COLUMN "sequence"`,
    );
  }
}
