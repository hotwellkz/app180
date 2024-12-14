export const formatAmount = (amount: number): string => {
  const absAmount = Math.round(Math.abs(amount));
  return absAmount.toLocaleString('ru-RU') + ' ₸';
};