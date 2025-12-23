import { MigrationInterface, QueryRunner } from 'typeorm';

export class IssueRefactor1766481631301 implements MigrationInterface {
  name = 'IssueRefactor1766481631301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * 1️⃣ contract_issue_item: issue_id → project_id 이관
     */
    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      ADD "project_id" integer
    `);

    await queryRunner.query(`
      UPDATE "contract_issue_item" ci
      SET "project_id" = i."project_id"
      FROM "issue" i
      WHERE ci."issue_id" = i."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      ADD CONSTRAINT "FK_contract_issue_item_project"
      FOREIGN KEY ("project_id")
      REFERENCES "project"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      DROP CONSTRAINT "FK_ca8e0354423942d9dc435cfd95d"
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      DROP COLUMN "issue_id"
    `);

    /**
     * 2️⃣ transaction_issue_item: issue_id → project_id 이관
     */
    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ADD "project_id" integer
    `);

    await queryRunner.query(`
      UPDATE "transaction_issue_item" ti
      SET "project_id" = i."project_id"
      FROM "issue" i
      WHERE ti."issue_id" = i."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ADD CONSTRAINT "FK_transaction_issue_item_project"
      FOREIGN KEY ("project_id")
      REFERENCES "project"("id")
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      DROP COLUMN "issue_id"
    `);

    /**
     * 3️⃣ contract_issue_item 타임스탬프 컬럼
     */
    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      ADD "deleted_at" TIMESTAMP
    `);

    /**
     * 4️⃣ transaction_issue_item 타임스탬프 컬럼
     */
    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ADD "deleted_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * down은 구조 복구만 (데이터 역이관은 현실적으로 불가)
     */

    // transaction_issue_item 복구
    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      ADD "issue_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      DROP CONSTRAINT "FK_transaction_issue_item_project"
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      DROP COLUMN "project_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      DROP COLUMN "deleted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      DROP COLUMN "updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "transaction_issue_item"
      DROP COLUMN "created_at"
    `);

    // contract_issue_item 복구
    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      ADD "issue_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      ADD CONSTRAINT "FK_ca8e0354423942d9dc435cfd95d"
      FOREIGN KEY ("issue_id")
      REFERENCES "issue"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      DROP CONSTRAINT "FK_contract_issue_item_project"
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      DROP COLUMN "project_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      DROP COLUMN "deleted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      DROP COLUMN "updated_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "contract_issue_item"
      DROP COLUMN "created_at"
    `);
  }
}
