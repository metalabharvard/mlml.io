import { expect, test } from "bun:test";
import moment from "moment-timezone";
import { convertEventTimes } from "./utils-events";

test("should convert times correctly for events starting in Berlin timezone", () => {
  const inputEvent = {
    start_date: "2023-07-21",
    start_date_time: "14:00:00",
    timezone: "Berlin",
  };

  const processedEvent = convertEventTimes(inputEvent);

  expect(processedEvent.timezone).toBe("Berlin");
  expect(processedEvent.tzid).toBe("Europe/Berlin");
  expect(processedEvent.start_time_utc).toMatch(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/,
  ); // Beispiel für Regex-Überprüfung
  // Weitere Assertions je nach erwartetem Ergebnis
});

test("should correctly handle events without start time, defaulting to 12:00:00", () => {
  const inputEvent = {
    start_date: "2023-07-22",
    timezone: "Boston",
  };

  const processedEvent = convertEventTimes(inputEvent);

  expect(processedEvent.timezone).toBe("Boston");
  expect(processedEvent.tzid).toBe("America/New_York");
  expect(processedEvent.start_time_utc).toContain("16:00:00"); // Dies setzt voraus, dass die Zeit entsprechend konvertiert wird
  // Weitere Assertions
});

test("should adjust end time to be at least one hour after start time if the same or before", () => {
  const inputEvent = {
    start_date: "2023-07-23",
    start_date_time: "16:00:00",
    end_date: "2023-07-23",
    end_date_time: "16:00:00",
    timezone: "Berlin",
  };

  const processedEvent = convertEventTimes(inputEvent);

  // Parse and compare moments to ensure at least one hour difference
  const startTime = moment(processedEvent.start_time);
  const endTime = moment(processedEvent.end_time);

  expect(endTime.diff(startTime, "hours")).toBeGreaterThanOrEqual(1);
});
