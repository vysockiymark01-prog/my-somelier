import type { PartyBillItemRow, PartyBillShareRow } from './supabase'

export interface Settlement {
  fromUserId: string
  toUserId: string
  amount: number
}

/**
 * Считает баланс каждого участника: сколько он заплатил за общие покупки
 * минус сколько стоит то, что он сам взял. Положительный баланс — ему
 * должны вернуть деньги, отрицательный — он должен доплатить.
 *
 * Позиции, которые никто не отметил как «своё», не учитываются вообще —
 * иначе платящий за них терял бы деньги без причины.
 */
export function computeBalances(
  items: PartyBillItemRow[],
  shares: PartyBillShareRow[]
): Map<string, number> {
  const balances = new Map<string, number>()
  const add = (userId: string, amount: number) => {
    balances.set(userId, (balances.get(userId) ?? 0) + amount)
  }

  items.forEach((item) => {
    const itemShares = shares.filter((s) => s.item_id === item.id)
    if (itemShares.length === 0) return
    add(item.paid_by, item.price)
    const perPerson = item.price / itemShares.length
    itemShares.forEach((s) => add(s.user_id, -perPerson))
  })

  return balances
}

/**
 * Превращает баланс в минимальный список переводов «кто кому платит»
 * жадным алгоритмом: сводит самого крупного должника с самым крупным
 * кредитором на каждом шаге.
 */
export function settleUp(balances: Map<string, number>): Settlement[] {
  const EPS = 0.01
  const creditors: [string, number][] = []
  const debtors: [string, number][] = []

  balances.forEach((amount, userId) => {
    if (amount > EPS) creditors.push([userId, amount])
    else if (amount < -EPS) debtors.push([userId, -amount])
  })

  creditors.sort((a, b) => b[1] - a[1])
  debtors.sort((a, b) => b[1] - a[1])

  const settlements: Settlement[] = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const [creditorId, creditAmount] = creditors[ci]
    const [debtorId, debtAmount] = debtors[di]
    const amount = Math.min(creditAmount, debtAmount)

    settlements.push({ fromUserId: debtorId, toUserId: creditorId, amount })

    creditors[ci][1] -= amount
    debtors[di][1] -= amount
    if (creditors[ci][1] <= EPS) ci++
    if (debtors[di][1] <= EPS) di++
  }

  return settlements
}
