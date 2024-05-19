import { expect, test } from "bun:test";
import { fixExternalLink, takeLatestDate } from "./utils";

test("should add http to URLs missing the scheme", () => {
  expect(fixExternalLink("example.com")).toBe("http://example.com");
});

test('should correct URLs with missing "h" in http', () => {
  expect(fixExternalLink("ttp://example.com")).toBe("http://example.com");
});

test("should not modify correct http URLs", () => {
  expect(fixExternalLink("http://example.com")).toBe("http://example.com");
});

test("should not modify correct https URLs", () => {
  expect(fixExternalLink("https://example.com")).toBe("https://example.com");
});

test("should trim whitespace from URLs", () => {
  expect(fixExternalLink("  http://example.com  ")).toBe("http://example.com");
});

test("should return an empty string for empty input", () => {
  expect(fixExternalLink("")).toBe("");
});

test("sollte das spätere Datum zurückgeben, wenn das erste Datum später ist", () => {
  const date1 = new Date(2022, 3, 25); // 25. April 2022
  const date2 = new Date(2021, 3, 25); // 25. April 2021
  expect(takeLatestDate(date1, date2)).toEqual(date1);
});

test("sollte das spätere Datum zurückgeben, wenn das zweite Datum später ist", () => {
  const date1 = new Date(2020, 3, 25); // 25. April 2020
  const date2 = new Date(2021, 3, 25); // 25. April 2021
  expect(takeLatestDate(date1, date2)).toEqual(date2);
});

test("sollte eines der Daten zurückgeben, wenn beide gleich sind", () => {
  const date1 = new Date(2021, 3, 25); // 25. April 2021
  const date2 = new Date(2021, 3, 25); // 25. April 2021, gleiches Datum wie date1
  expect(takeLatestDate(date1, date2)).toEqual(date1);
  expect(takeLatestDate(date1, date2)).toEqual(date2); // Beide Aufrufe sollten das gleiche Ergebnis liefern
});
