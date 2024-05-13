function getDateYear(date: Date): string {
  return date.getFullYear().toString();
}

function getDateMonth(date: Date): string {
  return date.toLocaleString("default", { month: "short" });
}

function getDateFull(date: Date): string {
  return `${date.getFullYear()}-${getDateMonth(date)}`;
}

function getDatePrint(date: Date): string {
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

function getDateMonthPrint(date: Date): string {
  return date.toLocaleString("default", { month: "long" });
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function createTimeString(start: string, end: string): string {
  if (start !== "" && end !== "") {
    const s = parseDate(start);
    const e = parseDate(end);
    if (getDateFull(s) === getDateFull(e)) {
      return getDatePrint(s);
    } else {
      if (getDateYear(s) === getDateYear(e)) {
        return `${getDateMonthPrint(s)}&ensp;–&ensp;${getDatePrint(e)}`;
      } else {
        return `${getDatePrint(s)}&ensp;–&ensp;${getDatePrint(e)}`;
      }
    }
  } else if (start !== "") {
    const s = parseDate(start);
    return `Since ${getDatePrint(s)}`;
  } else if (end !== "") {
    const e = parseDate(end);
    return getDatePrint(e);
  } else {
    return "";
  }
}

export function getMembersTwitter(members: any[]): string[] {
  return members
    .filter((member) => member.twitter)
    .map((member) => member.twitter);
}
