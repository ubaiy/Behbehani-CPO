/**
 * Date / label helpers shared by StepOneScheduleCard and StepThreeReviewCard.
 */

import type { DateCard, PreferredWindow } from './types';

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildDateCards(): DateCard[] {
  const cards: DateCard[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else label = DAY_SHORT[d.getDay()];
    cards.push({ label, dayNum: d.getDate(), month: MONTH_SHORT[d.getMonth()], iso });
  }
  return cards;
}

export function formatDateDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function windowLabel(w: PreferredWindow): string {
  switch (w) {
    case 'morning':   return 'Morning (8–12)';
    case 'afternoon': return 'Afternoon (12–4)';
    case 'evening':   return 'Evening (4–8)';
  }
}

/** Pre-built at module load time — same lifetime as the original constant. */
export const DATE_CARDS = buildDateCards();
