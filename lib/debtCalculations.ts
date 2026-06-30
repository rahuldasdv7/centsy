export interface Debt {
  id: string;
  name: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
}

export interface PayoffStep {
  debtId: string;
  name: string;
  monthsToPayoff: number;
  totalInterestPaid: number;
  payoffOrder: number;
}

export interface PayoffPlan {
  steps: PayoffStep[];
  totalMonths: number;
  totalInterestPaid: number;
}

/**
 * Simulates paying off debts month-by-month using either the Snowball
 * (smallest balance first) or Avalanche (highest interest rate first)
 * strategy, applying any extra monthly payment to the top-priority debt
 * once its minimum is covered.
 */
export function calculatePayoffPlan(
  debts: Debt[],
  extraMonthlyPayment: number,
  strategy: 'snowball' | 'avalanche'
): PayoffPlan {
  if (debts.length === 0) {
    return { steps: [], totalMonths: 0, totalInterestPaid: 0 };
  }

  // Work on copies so we don't mutate the caller's data
  const working = debts.map((d) => ({ ...d, remaining: d.balance }));

  // Order of attack: snowball = smallest balance first, avalanche = highest APR first
  const sortedIds = [...working]
    .sort((a, b) =>
      strategy === 'snowball'
        ? a.balance - b.balance
        : b.interest_rate - a.interest_rate
    )
    .map((d) => d.id);

  const payoffMonth: Record<string, number> = {};
  const interestPaid: Record<string, number> = {};
  working.forEach((d) => (interestPaid[d.id] = 0));

  let month = 0;
  const MAX_MONTHS = 600; // 50-year safety cap to prevent infinite loops on bad data

  while (working.some((d) => d.remaining > 0.01) && month < MAX_MONTHS) {
    month++;
    let freedUpPayment = extraMonthlyPayment;

    // Apply minimum payments + interest accrual to every active debt
    for (const debt of working) {
      if (debt.remaining <= 0.01) continue;
      const monthlyRate = debt.interest_rate / 100 / 12;
      const interest = debt.remaining * monthlyRate;
      interestPaid[debt.id] += interest;
      debt.remaining += interest;

      const payment = Math.min(debt.minimum_payment, debt.remaining);
      debt.remaining -= payment;

      if (debt.remaining <= 0.01 && !payoffMonth[debt.id]) {
        payoffMonth[debt.id] = month;
        // that debt's minimum payment now becomes extra for the next priority debt
        freedUpPayment += debt.minimum_payment - payment;
      }
    }

    // Apply all freed-up + extra payment to the highest-priority remaining debt
    for (const id of sortedIds) {
      const debt = working.find((d) => d.id === id)!;
      if (debt.remaining <= 0.01) continue;
      const extra = Math.min(freedUpPayment, debt.remaining);
      debt.remaining -= extra;
      freedUpPayment -= extra;
      if (debt.remaining <= 0.01 && !payoffMonth[debt.id]) {
        payoffMonth[debt.id] = month;
      }
      if (freedUpPayment <= 0) break;
    }
  }

  const steps: PayoffStep[] = sortedIds.map((id, index) => {
    const debt = debts.find((d) => d.id === id)!;
    return {
      debtId: id,
      name: debt.name,
      monthsToPayoff: payoffMonth[id] || month,
      totalInterestPaid: interestPaid[id],
      payoffOrder: index + 1,
    };
  });

  return {
    steps,
    totalMonths: month,
    totalInterestPaid: Object.values(interestPaid).reduce((sum, v) => sum + v, 0),
  };
}

export function fmtMonths(m: number): string {
  if (!isFinite(m) || m <= 0) return '—';
  if (m >= 600) return '50+ yrs';
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years === 0) return `${months} mo`;
  if (months === 0) return `${years} yr${years > 1 ? 's' : ''}`;
  return `${years}y ${months}m`;
}