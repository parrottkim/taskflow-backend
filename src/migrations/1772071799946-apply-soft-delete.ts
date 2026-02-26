import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplySoftDelete1772071799946 implements MigrationInterface {
  name = 'ApplySoftDelete1772071799946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "issue" DROP CONSTRAINT "FK_0c08813d7b129507a359bf60e84"`,
    );
    await queryRunner.query(
      `CREATE TABLE "trip_exchange_rate" ("id" SERIAL NOT NULL, "rate" numeric(10,4) NOT NULL, "applied_date" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "trip_id" integer, CONSTRAINT "PK_fcbd9b4bd458f0e6a4c3c148a42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_regulation_rate" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_regulation_rate" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_regulation_rate" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_fuel_expense" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_fuel_expense" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_fuel_expense" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_attachment" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_attachment" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_item" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_item" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_item" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD "currency_id" integer`,
    );
    await queryRunner.query(`
            UPDATE "contract_issue" ci
            SET "currency_id" = i."currency_id"
            FROM "issue" i
            WHERE ci."issue_id" = i."id" AND i."currency_id" IS NOT NULL
        `);
    await queryRunner.query(`ALTER TABLE "issue" DROP COLUMN "currency_id"`);
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_issue" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_issue" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_issue" ADD "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" DROP CONSTRAINT "FK_c381f1de80e4cc2f1dedeef315b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" DROP CONSTRAINT "REL_c381f1de80e4cc2f1dedeef315"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_c7488f713986a70052eb10f1178"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "REL_c7488f713986a70052eb10f117"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_34bfbb937675a502b547dab14af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "UQ_34bfbb937675a502b547dab14af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP CONSTRAINT "FK_d532e413d2ab8e9e05a7bee652e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP CONSTRAINT "UQ_d532e413d2ab8e9e05a7bee652e"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_17428d383443617355daed8722" ON "trip_report" ("report_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7bdb25aa0e3208bed828525410" ON "report" ("schedule_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fb274955761e490239b6e8ca5a" ON "kickoff_issue" ("project_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_24a096950d60131f1ca068439b" ON "contract_issue" ("project_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0b51dea2aa2fd5ae13ea6258db" ON "transaction_issue" ("project_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_41c068b600b7493797ba231792" ON "payment_issue" ("project_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ADD CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5" FOREIGN KEY ("trip_id") REFERENCES "trip_report"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ADD CONSTRAINT "FK_c381f1de80e4cc2f1dedeef315b" FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_c7488f713986a70052eb10f1178" FOREIGN KEY ("schedule_id") REFERENCES "schedule"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_34bfbb937675a502b547dab14af" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD CONSTRAINT "FK_d532e413d2ab8e9e05a7bee652e" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP CONSTRAINT "FK_d532e413d2ab8e9e05a7bee652e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_2feaef29daad911d5d2a59bfe83"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP CONSTRAINT "FK_34bfbb937675a502b547dab14af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" DROP CONSTRAINT "FK_c7488f713986a70052eb10f1178"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" DROP CONSTRAINT "FK_c381f1de80e4cc2f1dedeef315b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" DROP CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_41c068b600b7493797ba231792"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0b51dea2aa2fd5ae13ea6258db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24a096950d60131f1ca068439b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb274955761e490239b6e8ca5a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7bdb25aa0e3208bed828525410"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17428d383443617355daed8722"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD CONSTRAINT "UQ_d532e413d2ab8e9e05a7bee652e" UNIQUE ("project_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" ADD CONSTRAINT "FK_d532e413d2ab8e9e05a7bee652e" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "UQ_34bfbb937675a502b547dab14af" UNIQUE ("project_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" ADD CONSTRAINT "FK_34bfbb937675a502b547dab14af" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "REL_c7488f713986a70052eb10f117" UNIQUE ("schedule_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "report" ADD CONSTRAINT "FK_c7488f713986a70052eb10f1178" FOREIGN KEY ("schedule_id") REFERENCES "schedule"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ADD CONSTRAINT "REL_c381f1de80e4cc2f1dedeef315" UNIQUE ("report_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" ADD CONSTRAINT "FK_c381f1de80e4cc2f1dedeef315b" FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_issue" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_issue" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_issue" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_issue" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction_issue" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(`ALTER TABLE "issue" ADD "currency_id" integer`);
    await queryRunner.query(`
            UPDATE "issue" i
            SET "currency_id" = ci."currency_id"
            FROM "contract_issue" ci
            WHERE i."id" = ci."issue_id" AND ci."currency_id" IS NOT NULL
        `);
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "currency_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "kickoff_issue" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_item" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_item" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "procurement_issue_item" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "issue_attachment" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_attachment" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_attachment" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_report" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_fuel_expense" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_fuel_expense" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_fuel_expense" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_regulation_rate" DROP COLUMN "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_regulation_rate" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_regulation_rate" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(`DROP TABLE "trip_exchange_rate"`);
    await queryRunner.query(
      `ALTER TABLE "issue" ADD CONSTRAINT "FK_0c08813d7b129507a359bf60e84" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
