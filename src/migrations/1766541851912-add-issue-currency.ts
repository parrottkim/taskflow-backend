import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIssueCurrency1766541851912 implements MigrationInterface {
  name = 'AddIssueCurrency1766541851912';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 먼저 새로운 컬럼을 추가합니다.
    await queryRunner.query(`ALTER TABLE "issue" ADD "currency_id" integer`);

    // 2. [데이터 복사] 기존 contract_issue에 있는 currency_id를 issue 테이블로 이관합니다.
    // 이 작업은 기존 컬럼을 DROP하기 전에 수행해야 합니다.
    await queryRunner.query(`
      UPDATE issue 
      SET currency_id = ci.currency_id 
      FROM contract_issue ci 
      WHERE issue.id = ci.issue_id 
      AND ci.currency_id IS NOT NULL 
    `);

    await queryRunner.query(`
      UPDATE issue i
      SET currency_id = sub.currency_id
      FROM (
          SELECT i2.project_id, i2.currency_id
          FROM issue i2
          WHERE i2.currency_id IS NOT NULL
      ) AS sub
      WHERE i.project_id = sub.project_id
      AND i.currency_id IS NULL;
    `);

    // 3. 제약 조건 및 기존 컬럼 삭제 (제공해주신 로직)
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP CONSTRAINT "FK_721a593155673fa035c8f81f8f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_transaction_issue_item_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_contract_issue_item_project"`,
    );

    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "currency_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP COLUMN "currency_id"`,
    );

    // 4. 새로운 외래키 제약 조건 설정
    await queryRunner.query(
      `ALTER TABLE "issue" ADD CONSTRAINT "FK_0c08813d7b129507a359bf60e84" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_eac56fb94ef3d6a9faec766e293" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_46e4dd18e93c81289a9efd2af3f" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 복구 로직: 거꾸로 issue에서 각 테이블로 데이터를 다시 돌려놓는 로직이 필요할 수 있습니다.
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "currency_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD "currency_id" integer`,
    );

    // 데이터 복구 (필요 시)
    await queryRunner.query(`
            UPDATE "contract_issue" ci 
            SET "currency_id" = i."currency_id" 
            FROM "issue" i 
            WHERE ci."issue_id" = i."id"
        `);

    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" DROP CONSTRAINT "FK_46e4dd18e93c81289a9efd2af3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" DROP CONSTRAINT "FK_eac56fb94ef3d6a9faec766e293"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue" DROP CONSTRAINT "FK_0c08813d7b129507a359bf60e84"`,
    );
    await queryRunner.query(`ALTER TABLE "issue" DROP COLUMN "currency_id"`);

    await queryRunner.query(
      `ALTER TABLE "contract_issue_item" ADD CONSTRAINT "FK_contract_issue_item_project" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue_item" ADD CONSTRAINT "FK_transaction_issue_item_project" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD CONSTRAINT "FK_721a593155673fa035c8f81f8f2" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
