import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetItemsCascade1768455341124 implements MigrationInterface {
  name = 'SetItemsCascade1768455341124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_eac56fb94ef3d6a9faec766e293"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_46e4dd18e93c81289a9efd2af3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_eac56fb94ef3d6a9faec766e293" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_46e4dd18e93c81289a9efd2af3f" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_46e4dd18e93c81289a9efd2af3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_eac56fb94ef3d6a9faec766e293"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_46e4dd18e93c81289a9efd2af3f" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_eac56fb94ef3d6a9faec766e293" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
