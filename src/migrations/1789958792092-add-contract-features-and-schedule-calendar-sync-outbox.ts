import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractFeaturesAndScheduleCalendarSyncOutbox1789958792092 implements MigrationInterface {
  name = 'AddContractFeaturesAndScheduleCalendarSyncOutbox1789958792092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" DROP CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_74471c489079fc4ef231bd1d28"`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_exchange_rate" ("id" SERIAL NOT NULL, "rate" numeric(10,4) NOT NULL, "applied_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "contract_id" integer NOT NULL, CONSTRAINT "REL_0e752aafb92548bb438632429a" UNIQUE ("contract_id"), CONSTRAINT "PK_23a031fad2be3247564140e1bbe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."schedule_calendar_sync_operation_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."schedule_calendar_sync_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "schedule_calendar_sync" ("id" SERIAL NOT NULL, "operation" "public"."schedule_calendar_sync_operation_enum" NOT NULL, "status" "public"."schedule_calendar_sync_status_enum" NOT NULL DEFAULT 'PENDING', "payload" jsonb NOT NULL DEFAULT '{}', "event_id" character varying NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP NOT NULL DEFAULT now(), "locked_at" TIMESTAMP, "processed_at" TIMESTAMP, "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "schedule_id" integer NOT NULL, CONSTRAINT "PK_2801b26de640de9b32de026d101" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_calendar_sync_pending" ON "schedule_calendar_sync" ("status", "next_attempt_at", "id") `,
    );
    await queryRunner.query(`
  ALTER TABLE "contract_issue"
  ADD "contract_date" date
`);

    await queryRunner.query(`
  UPDATE "contract_issue"
  SET "contract_date" = "created_at"::date
  WHERE "contract_date" IS NULL
`);

    await queryRunner.query(`
  ALTER TABLE "contract_issue"
  ALTER COLUMN "contract_date" SET NOT NULL
`);
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ALTER COLUMN "trip_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ADD CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5" FOREIGN KEY ("trip_id") REFERENCES "trip_report"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_exchange_rate" ADD CONSTRAINT "FK_0e752aafb92548bb438632429a2" FOREIGN KEY ("contract_id") REFERENCES "contract_issue"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_calendar_sync" ADD CONSTRAINT "FK_ed094bfa3bfa95f87dbc7367f9d" FOREIGN KEY ("schedule_id") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schedule_calendar_sync" DROP CONSTRAINT "FK_ed094bfa3bfa95f87dbc7367f9d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_exchange_rate" DROP CONSTRAINT "FK_0e752aafb92548bb438632429a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" DROP CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ALTER COLUMN "trip_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_issue" DROP COLUMN "contract_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_schedule_calendar_sync_pending"`,
    );
    await queryRunner.query(`DROP TABLE "schedule_calendar_sync"`);
    await queryRunner.query(
      `DROP TYPE "public"."schedule_calendar_sync_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."schedule_calendar_sync_operation_enum"`,
    );
    await queryRunner.query(`DROP TABLE "contract_exchange_rate"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_74471c489079fc4ef231bd1d28" ON "trip_exchange_rate" ("trip_id") WHERE (deleted_at IS NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ADD CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5" FOREIGN KEY ("trip_id") REFERENCES "trip_report"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
