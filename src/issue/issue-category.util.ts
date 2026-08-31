import { BadRequestException } from '@nestjs/common';

export function assertIssueCategory(
  categoryId: number,
  expectedCategoryId: number,
) {
  if (categoryId !== expectedCategoryId) {
    throw new BadRequestException('bad_request_issue_category_invalid');
  }
}

export function shouldAdvanceLatestCategory(
  currentCategoryId: number | null | undefined,
  nextCategoryId: number,
) {
  return (currentCategoryId ?? 0) < nextCategoryId;
}
