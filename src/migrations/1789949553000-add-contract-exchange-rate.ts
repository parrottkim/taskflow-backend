import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractExchangeRate1789949553000 implements MigrationInterface {
  name = 'AddContractExchangeRate1789949553000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "contract_date" date`,
    );
    await queryRunner.query(
      `UPDATE "contract_issue" AS "contract" SET "contract_date" = "issue"."created_at"::date FROM "issue" AS "issue" WHERE "contract"."issue_id" = "issue"."id" AND "contract"."contract_date" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "contract_issue" SET "contract_date" = "created_at"::date WHERE "contract_date" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ALTER COLUMN "contract_date" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_exchange_rate" ("id" SERIAL NOT NULL, "rate" numeric(10,4) NOT NULL, "applied_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "contract_id" integer NOT NULL, CONSTRAINT "UQ_contract_exchange_rate_contract" UNIQUE ("contract_id"), CONSTRAINT "PK_contract_exchange_rate" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_contract_exchange_rate_active_contract" ON "contract_exchange_rate" ("contract_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_exchange_rate" ADD CONSTRAINT "FK_contract_exchange_rate_contract" FOREIGN KEY ("contract_id") REFERENCES "contract_issue"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contract_exchange_rate" DROP CONSTRAINT "FK_contract_exchange_rate_contract"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_contract_exchange_rate_active_contract"`,
    );
    await queryRunner.query(`DROP TABLE "contract_exchange_rate"`);
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "contract_date"`,
    );
  }
}
