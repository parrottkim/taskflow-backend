jest.mock('@/mail/mail.service', () => ({
  MailService: class {},
}));

import dayjs from 'dayjs';
import { ContractIssueService } from './contract-issue.service';

describe('ContractIssueService', () => {
  describe('getContractExchangeRate', () => {
    it('requests the contract exchange rate using the contract date', async () => {
      const getExchangeRate = jest.fn().mockResolvedValue({
        rate: 1380.5,
        appliedDate: '2026-08-13',
      });
      const service = new ContractIssueService(
        {} as never,
        { getExchangeRate } as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const snapshot = await (
        service as unknown as {
          getContractExchangeRate(
            contractDate: string,
            currency: { code: string },
          ): Promise<{ rate: number; appliedDate: string } | null>;
        }
      ).getContractExchangeRate('2026-08-13', { code: 'USD' });

      expect(getExchangeRate).toHaveBeenCalledWith(
        dayjs('2026-08-13').toDate(),
        'USD',
      );
      expect(snapshot).toEqual({
        rate: 1380.5,
        appliedDate: '2026-08-13',
      });
    });

    it('does not request an exchange rate for KRW contracts', async () => {
      const getExchangeRate = jest.fn();
      const service = new ContractIssueService(
        {} as never,
        { getExchangeRate } as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const snapshot = await (
        service as unknown as {
          getContractExchangeRate(
            contractDate: string,
            currency: { code: string },
          ): Promise<{ rate: number; appliedDate: string } | null>;
        }
      ).getContractExchangeRate('2026-08-13', { code: 'KRW' });

      expect(getExchangeRate).not.toHaveBeenCalled();
      expect(snapshot).toBeNull();
    });
  });
});
