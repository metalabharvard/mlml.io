import { expect, test } from "bun:test";
import { fixExternalLink } from "./utils";

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
