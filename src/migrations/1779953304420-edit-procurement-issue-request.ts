import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditProcurementIssueRequest1779953304420 implements MigrationInterface {
  name = 'EditProcurementIssueRequest1779953304420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "supplier" DROP COLUMN "fax"`);
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ADD "title" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "has_fee" SET DEFAULT 'false'`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "requires_approval" SET DEFAULT 'false'`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "is_approved" SET DEFAULT 'false'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "is_approved" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "requires_approval" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" ALTER COLUMN "has_fee" SET DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_request" DROP COLUMN "title"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supplier" ADD "fax" character varying`,
    );
  }
}
