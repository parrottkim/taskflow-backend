import { BadRequestException } from '@nestjs/common';
import {
  assertIssueCategory,
  shouldAdvanceLatestCategory,
} from './issue-category.util';

describe('issue category progression', () => {
  it('keeps the higher category when a lower category is registered', () => {
    expect(shouldAdvanceLatestCategory(5, 3)).toBe(false);
  });

  it('advances when a higher category is registered', () => {
    expect(shouldAdvanceLatestCategory(2, 4)).toBe(true);
  });

  it('sets the first category when the project has no category', () => {
    expect(shouldAdvanceLatestCategory(null, 1)).toBe(true);
  });

  it('rejects a category that does not match the category-specific API', () => {
    expect(() => assertIssueCategory(6, 1)).toThrow(
      new BadRequestException('bad_request_issue_category_invalid'),
    );
  });
});
