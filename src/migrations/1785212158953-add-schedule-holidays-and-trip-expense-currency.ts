import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduleHolidaysAndTripExpenseCurrency1785212158953 implements MigrationInterface {
  name = 'AddScheduleHolidaysAndTripExpenseCurrency1785212158953';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."schedule_holiday_type_enum" AS ENUM('WEEKEND', 'PUBLIC_HOLIDAY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "schedule_holiday" ("id" SERIAL NOT NULL, "type" "public"."schedule_holiday_type_enum" NOT NULL, "date" date NOT NULL, "name" character varying, "is_travel_only" boolean NOT NULL DEFAULT false, "compensatory_leave_date" date, "schedule_id" integer NOT NULL, CONSTRAINT "UQ_df890b103b8d27a456973c0e6e6" UNIQUE ("schedule_id", "date"), CONSTRAINT "PK_7cefb59b60003187c62b28691af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule" ALTER COLUMN "start" TYPE date USING (("start" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date)`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule" ALTER COLUMN "end" TYPE date USING (("end" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul')::date)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD "payment_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD "exchange_rate" numeric(10,4) NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD "exchange_rate_applied_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD "currency_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_step" ADD "requires_expense_currency" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "trip_actual_expense"
       SET "currency_id" = (
         SELECT "id"
         FROM "currency"
         WHERE "code" = 'KRW'
         LIMIT 1
       )
       WHERE "currency_id" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "trip_step"
       SET "requires_expense_currency" = true
       WHERE "id" IN (18, 19)`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" ADD CONSTRAINT "FK_b968f14f84f5b6d325bdd371145" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_holiday" ADD CONSTRAINT "FK_5aa33ae3544c3138de53ee39d06" FOREIGN KEY ("schedule_id") REFERENCES "schedule"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "schedule_holiday" DROP CONSTRAINT "FK_5aa33ae3544c3138de53ee39d06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP CONSTRAINT "FK_b968f14f84f5b6d325bdd371145"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_step" DROP COLUMN "requires_expense_currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP COLUMN "currency_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP COLUMN "exchange_rate_applied_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP COLUMN "exchange_rate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_actual_expense" DROP COLUMN "payment_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule" ALTER COLUMN "end" TYPE TIMESTAMP WITHOUT TIME ZONE USING ("end"::timestamp AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule" ALTER COLUMN "start" TYPE TIMESTAMP WITHOUT TIME ZONE USING ("start"::timestamp AT TIME ZONE 'Asia/Seoul' AT TIME ZONE 'UTC')`,
    );
    await queryRunner.query(`DROP TABLE "schedule_holiday"`);
    await queryRunner.query(`DROP TYPE "public"."schedule_holiday_type_enum"`);
  }
}
