/**
 * Barème officiel des frais de transfert FedaPay (payout / reversement sous-compte) :
 * - 0 à 10 000 XOF       : 150 XOF
 * - 10 001 à 50 000 XOF   : 300 XOF
 * - 50 001 à 150 000 XOF  : 800 XOF
 * - 150 001 à 500 000 XOF : 2 000 XOF
 * - Plus de 500 000 XOF   : 2 500 XOF
 */
export function calculateFedaPayTransferFee(amount: number): number {
  if (amount <= 0) return 0;
  if (amount <= 10_000) return 150;
  if (amount <= 50_000) return 300;
  if (amount <= 150_000) return 800;
  if (amount <= 500_000) return 2_000;
  return 2_500;
}
