import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeTripExchangeRateOneToOne1775530684231 implements MigrationInterface {
    name = 'MakeTripExchangeRateOneToOne1775530684231'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_exchange_rate" DROP CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5"`);
        await queryRunner.query(`ALTER TABLE "trip_exchange_rate" ADD CONSTRAINT "UQ_1892f15aae7208a8c196c6dcac5" UNIQUE ("trip_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74471c489079fc4ef231bd1d28" ON "trip_exchange_rate" ("trip_id") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "trip_exchange_rate" ADD CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5" FOREIGN KEY ("trip_id") REFERENCES "trip_report"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "trip_exchange_rate" DROP CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_74471c489079fc4ef231bd1d28"`);
        await queryRunner.query(`ALTER TABLE "trip_exchange_rate" DROP CONSTRAINT "UQ_1892f15aae7208a8c196c6dcac5"`);
        await queryRunner.query(`ALTER TABLE "trip_exchange_rate" ADD CONSTRAINT "FK_1892f15aae7208a8c196c6dcac5" FOREIGN KEY ("trip_id") REFERENCES "trip_report"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
