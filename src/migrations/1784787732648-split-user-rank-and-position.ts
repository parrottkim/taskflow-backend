import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitUserRankAndPosition1784787732648 implements MigrationInterface {
  name = 'SplitUserRankAndPosition1784787732648';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_rank" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_016bc73bf33e414c9c3b28781f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "user_rank" ("id", "name") SELECT "id", "name" FROM "user_position"`,
    );
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('user_rank', 'id'), COALESCE(MAX("id"), 1), MAX("id") IS NOT NULL) FROM "user_rank"`,
    );

    await queryRunner.query(`ALTER TABLE "user" ADD "rank_id" integer`);
    await queryRunner.query(`UPDATE "user" SET "rank_id" = "position_id"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_016bc73bf33e414c9c3b28781f3" FOREIGN KEY ("rank_id") REFERENCES "user_rank"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`UPDATE "user" SET "position_id" = NULL`);
    await queryRunner.query(`DELETE FROM "user_position"`);
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('user_position', 'id'), 1, false)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_016bc73bf33e414c9c3b28781f3"`,
    );

    await queryRunner.query(`UPDATE "user" SET "position_id" = NULL`);
    await queryRunner.query(`DELETE FROM "user_position"`);
    await queryRunner.query(
      `INSERT INTO "user_position" ("id", "name") SELECT "id", "name" FROM "user_rank"`,
    );
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('user_position', 'id'), COALESCE(MAX("id"), 1), MAX("id") IS NOT NULL) FROM "user_position"`,
    );
    await queryRunner.query(`UPDATE "user" SET "position_id" = "rank_id"`);

    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "rank_id"`);
    await queryRunner.query(`DROP TABLE "user_rank"`);
  }
}
