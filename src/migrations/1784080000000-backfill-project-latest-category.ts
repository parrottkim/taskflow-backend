import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillProjectLatestCategory1784080000000 implements MigrationInterface {
  name = 'BackfillProjectLatestCategory1784080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "project" AS "project"
      SET "latest_category_id" = GREATEST(
        COALESCE("project"."latest_category_id", 0),
        "highest_category"."category_id"
      )
      FROM (
        SELECT "issue"."project_id", MAX("issue"."category_id") AS "category_id"
        FROM "issue"
        WHERE "issue"."deleted_at" IS NULL
        GROUP BY "issue"."project_id"
      ) AS "highest_category"
      WHERE "project"."id" = "highest_category"."project_id"
        AND (
          "project"."latest_category_id" IS NULL
          OR "project"."latest_category_id" < "highest_category"."category_id"
        )
    `);
  }

  public async down(): Promise<void> {
    // 이전 latestCategory 값은 복원할 수 없는 데이터 보정이다.
  }
}
