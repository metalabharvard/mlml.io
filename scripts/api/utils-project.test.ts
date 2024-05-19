import { expect, test } from "bun:test";
import {
  getDateYear,
  getDateMonth,
  getDateFull,
  getDatePrint,
  getDateMonthPrint,
  createTimeString,
} from "./utils-project";

const testDate = new Date("2023-01-15T00:00:00Z");

test("getDateYear returns the year of a Date object", () => {
  expect(getDateYear(testDate)).toBe("2023");
});

test("getDateMonth returns the month of a Date object in short format", () => {
  expect(getDateMonth(testDate)).toBe("Jan");
});

test("getDateFull returns a string formatted as YYYY-MMM", () => {
  expect(getDateFull(testDate)).toBe("2023-Jan");
});

test("getDatePrint returns a string formatted as Month YYYY", () => {
  expect(getDatePrint(testDate)).toBe("January 2023");
});

test("getDateMonthPrint returns the month of a Date object in long format", () => {
  expect(getDateMonthPrint(testDate)).toBe("January");
});

test("returns correct string for same year and month", () => {
  const start = "2023-01-01";
  const end = "2023-01-31";
  expect(createTimeString(start, end)).toBe("January 2023");
});

test("returns correct string for the same year but different months", () => {
  const start = "2023-01-01";
  const end = "2023-02-28";
  // Hinweis: Der tatsächliche Rückgabewert kann je nach Spracheinstellungen variieren.
  expect(createTimeString(start, end)).toContain(
    "January&ensp;–&ensp;February 2023",
  );
});

test("returns correct string for different years", () => {
  const start = "2022-12-01";
  const end = "2023-01-31";
  // Hinweis: Der tatsächliche Rückgabewert kann je nach Spracheinstellungen variieren.
  expect(createTimeString(start, end)).toContain(
    "December 2022&ensp;–&ensp;January 2023",
  );
});

test('returns "Since {date}" for only start date', () => {
  const start = "2023-01-01";
  expect(createTimeString(start, "")).toContain("Since January 2023");
});

test("returns only print date for only end date", () => {
  const end = "2023-02-01";
  expect(createTimeString("", end)).toContain("February 2023");
});

test("returns empty string for no dates", () => {
  expect(createTimeString("", "")).toBe("");
});
