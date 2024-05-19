import { trim } from "./utils";

export function getDateYear(date: Date): string {
  return date.getFullYear().toString();
}

export function getDateMonth(date: Date): string {
  return date.toLocaleString("default", { month: "short" });
}

export function getDateFull(date: Date): string {
  return `${date.getFullYear()}-${getDateMonth(date)}`;
}

export function getDatePrint(date: Date): string {
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

export function getDateMonthPrint(date: Date): string {
  return date.toLocaleString("default", { month: "long" });
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function createTimeString(start: string, end: string): string {
  if (start !== "" && end !== "" && start != null && end != null) {
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
  } else if (start !== "" && start != null) {
    const s = parseDate(start);
    return `Since ${getDatePrint(s)}`;
  } else if (end !== "" && end != null) {
    const e = parseDate(end);
    return getDatePrint(e);
  } else {
    return "";
  }
}

export function getMembersTwitter(members: any[]): string[] {
  return members
    .filter(({ attributes: member }) => member.twitter)
    .map(({ attributes: member }) => member.twitter);
}

interface Keyword {
  keyword: string;
}

interface Type {
  attributes: {
    label: string;
  };
}

export function createTags(
  keywords: Keyword[] = [],
  types: Type[] = [],
): string[] {
  const keys: Record<string, boolean> = {};
  const tags: string[] = []; // This is used to store the list of unique entries
  keywords.forEach(({ keyword }) => {
    const tag = trim(keyword);
    const key = tag.toLowerCase(); // Lowercase to compare them
    if (key.length && !keys[key]) {
      keys[key] = true;
      tags.push(tag);
    }
  });
  types.forEach(({ attributes: type }) => {
    const tag = trim(type.label);
    const key = tag.toLowerCase(); // Lowercase to compare them
    if (key.length && !keys[key]) {
      keys[key] = true;
      tags.push(tag);
    }
  });
  return tags;
}
