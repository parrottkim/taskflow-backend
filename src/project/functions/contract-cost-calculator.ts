export function calculateContractAmountInKrw(
  amount: number,
  currencyCode: string,
  exchangeRate?: number | null,
) {
  if (currencyCode === 'KRW') return amount;

  if (exchangeRate == null) {
    throw new Error('contract_exchange_rate_required');
  }

  return Math.round(amount * exchangeRate);
}
