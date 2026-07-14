import { BadRequestException } from '@nestjs/common';

export function assertIssueCategory(
  categoryId: number,
  expectedCategoryId: number,
) {
  if (categoryId !== expectedCategoryId) {
    throw new BadRequestException('invalid_issue_category');
  }
}

export function shouldAdvanceLatestCategory(
  currentCategoryId: number | null | undefined,
  nextCategoryId: number,
) {
  return (currentCategoryId ?? 0) < nextCategoryId;
}
