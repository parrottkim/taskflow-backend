import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleCalendarSyncOutbox1789953000000 implements MigrationInterface {
  name = 'AddScheduleCalendarSyncOutbox1789953000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."schedule_calendar_sync_operation_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."schedule_calendar_sync_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "schedule_calendar_sync" ("id" SERIAL NOT NULL, "operation" "public"."schedule_calendar_sync_operation_enum" NOT NULL, "status" "public"."schedule_calendar_sync_status_enum" NOT NULL DEFAULT 'PENDING', "payload" jsonb NOT NULL DEFAULT '{}', "event_id" character varying NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP NOT NULL DEFAULT now(), "locked_at" TIMESTAMP, "processed_at" TIMESTAMP, "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "schedule_id" integer NOT NULL, CONSTRAINT "PK_schedule_calendar_sync" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_schedule_calendar_sync_pending" ON "schedule_calendar_sync" ("status", "next_attempt_at", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_calendar_sync" ADD CONSTRAINT "FK_schedule_calendar_sync_schedule" FOREIGN KEY ("schedule_id") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schedule_calendar_sync" DROP CONSTRAINT "FK_schedule_calendar_sync_schedule"`,
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
  }
}
