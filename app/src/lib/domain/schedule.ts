// Fulfillment scheduling engine (tech spec §8). Dates are "YYYY-MM-DD" strings in Asia/Jakarta.

export type DateStatus = "UNAVAILABLE" | "HOLIDAY";
export type Calendar = Record<string, DateStatus>;

const DAY = 86_400_000;
const WIB_OFFSET = 7 * 3_600_000; // Asia/Jakarta is UTC+7 with no DST

export const addDays = (date: string, days: number) => new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
export const weekday = (date: string) => new Date(date).getUTCDay(); // 0 = Sunday
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export function jakartaNow(instant: Date) {
  const local = new Date(instant.getTime() + WIB_OFFSET).toISOString();
  return { date: local.slice(0, 10), hour: Number(local.slice(11, 13)) };
}

export const isOperational = (date: string, calendar: Calendar) => weekday(date) >= 1 && weekday(date) <= 5 && !calendar[date];

export function promisedReadyDate(instant: Date, calendar: Calendar) {
  const { date, hour } = jakartaNow(instant);
  const schedulingDate = hour >= 18 ? addDays(date, 1) : date;
  const dow = weekday(schedulingDate);
  // Mon→Wed, Tue→Thu, Wed→Fri, Thu–Sun→next Monday
  let candidate = addDays(schedulingDate, dow >= 1 && dow <= 3 ? 2 : (8 - dow) % 7);
  while (!isOperational(candidate, calendar)) candidate = addDays(candidate, 1);
  return candidate;
}

// §8.5: recommend a new date for orders on a date being blocked. `calendar` must already include the block.
export function recommendReschedule(target: string, calendar: Calendar, today: string): string | null {
  let forward = addDays(target, 1);
  while (!isOperational(forward, calendar)) forward = addDays(forward, 1);
  if (daysBetween(target, forward) <= 3) return forward;
  for (let back = addDays(target, -1); back >= today; back = addDays(back, -1)) if (isOperational(back, calendar)) return back;
  return null;
}

export const formatDate = (date: string, style: "long" | "short" = "long", locale: "ID" | "EN" = "ID") =>
  new Intl.DateTimeFormat(locale === "EN" ? "en-GB" : "id-ID", style === "long" ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(date));
