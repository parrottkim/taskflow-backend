import { calculateContractAmountInKrw } from './contract-cost-calculator';

describe('calculateContractAmountInKrw', () => {
  it('원화 계약금액은 그대로 반환한다', () => {
    expect(calculateContractAmountInKrw(1200000, 'KRW')).toBe(1200000);
  });

  it('외화 계약금액은 저장된 환율로 원화 환산 후 반올림한다', () => {
    expect(calculateContractAmountInKrw(1000.25, 'USD', 1380.5)).toBe(1380845);
  });

  it('외화 계약의 환율이 없으면 계산하지 않는다', () => {
    expect(() => calculateContractAmountInKrw(1000, 'USD')).toThrow(
      'contract_exchange_rate_required',
    );
  });
});
