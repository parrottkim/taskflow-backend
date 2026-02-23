import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTripExchangeRate1771808176879 implements MigrationInterface {
  name = 'AddTripExchangeRate1771808176879';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "trip_exchange_rate" ("id" SERIAL NOT NULL, "rate" numeric(10,4) NOT NULL, "applied_date" TIMESTAMP NOT NULL, "note" character varying, "trip_id" integer, CONSTRAINT "PK_fcbd9b4bd458f0e6a4c3c148a42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" ADD CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5" FOREIGN KEY ("trip_id") REFERENCES "trip_report"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trip_exchange_rate" DROP CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5"`,
    );
    await queryRunner.query(`DROP TABLE "trip_exchange_rate"`);
  }
}
