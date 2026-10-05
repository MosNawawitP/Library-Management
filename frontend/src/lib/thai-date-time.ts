const THAI_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeZone: "Asia/Bangkok",
});

const THAI_TIME_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Bangkok",
});

export function formatThaiDateTime(timestamp: string): string {
  const dateTime = new Date(timestamp);
  const date = THAI_DATE_FORMATTER.format(dateTime);
  const time = THAI_TIME_FORMATTER.format(dateTime);

  return `${date} เวลา ${time} น.`;
}
