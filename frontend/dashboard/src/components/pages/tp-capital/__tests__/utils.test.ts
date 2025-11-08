/**
 * Utils Module Tests
 *
 * Tests for utility functions: formatting, CSV export, file download
 */

import { describe, it, expect } from "vitest";
import { formatNumber, formatTimestamp, toCsv, buildQuery } from "../utils";

describe("formatNumber", () => {
  it("should format numbers with 2 decimal places (PT-BR format)", () => {
    expect(formatNumber(28.5)).toBe("28,50"); // Uses comma (PT-BR locale)
    expect(formatNumber(28.123)).toBe("28,12");
    expect(formatNumber(28)).toBe("28,00");
  });

  it("should handle null/undefined with question mark", () => {
    expect(formatNumber(null)).toBe("?");
    expect(formatNumber(undefined)).toBe("?");
  });

  it("should handle zero", () => {
    expect(formatNumber(0)).toBe("0,00");
  });

  it("should format large numbers with thousands separator", () => {
    expect(formatNumber(1000)).toBe("1.000,00"); // PT-BR uses . for thousands
    expect(formatNumber(1234567.89)).toBe("1.234.567,89");
  });
});

describe("formatTimestamp", () => {
  it("should format numeric timestamp (milliseconds)", () => {
    const timestamp = 1699000000000; // Nov 3, 2023
    const result = formatTimestamp(timestamp);

    // Returns object with time and date
    expect(result).toHaveProperty("time");
    expect(result).toHaveProperty("date");
    expect(result.time).toMatch(/\d{2}:\d{2}:\d{2}/); // HH:MM:SS
    expect(result.date).toMatch(/\d{2}\/\d{2}\/\d{4}/); // DD/MM/YYYY
  });

  it("should handle null/undefined with question mark", () => {
    expect(formatTimestamp(null)).toBe("?");
    expect(formatTimestamp(undefined)).toBe("?");
  });

  it("should handle invalid timestamps", () => {
    expect(formatTimestamp("invalid")).toBe("?");
    expect(formatTimestamp(NaN)).toBe("?");
  });
});

describe("toCsv", () => {
  it("should convert signals array to CSV with semicolon separator", () => {
    const signals = [
      {
        ts: 1699000000000,
        asset: "PETR4",
        signal_type: "Swing",
        buy_min: 28.5,
        buy_max: 29.0,
        target_1: 30.0,
        target_2: 31.0,
        target_final: 32.0,
        stop: 27.5,
        channel: "TP",
        ingested_at: "2023-11-03T10:00:00Z",
      },
    ] as any;

    const csv = toCsv(signals);

    // Should have headers in Portuguese with semicolon
    expect(csv).toContain("DATA;ATIVO;COMPRA_MIN;COMPRA_MAX");

    // Should have data with semicolon separator
    expect(csv).toContain("PETR4;28,50;29,00");
  });

  it("should handle empty array with headers only", () => {
    const csv = toCsv([]);
    expect(csv).toBe(
      "DATA;ATIVO;COMPRA_MIN;COMPRA_MAX;ALVO_1;ALVO_2;ALVO_FINAL;STOP",
    );
  });

  it("should use semicolon separator (not comma)", () => {
    const signals = [
      {
        ts: 1699000000000,
        asset: "PETR4",
        signal_type: "Swing",
        buy_min: 100,
        buy_max: 110,
        target_1: null,
        target_2: null,
        target_final: null,
        stop: null,
        channel: "Test",
        ingested_at: "2023-11-03T10:00:00Z",
      },
    ] as any;

    const csv = toCsv(signals);

    // Should use semicolon (Excel-friendly for PT-BR locale)
    expect(csv).toContain("PETR4;100,00;110,00");
  });
});

describe("buildQuery", () => {
  it("should build full URL with all parameters", () => {
    const url = buildQuery({
      limit: 50,
      channel: "TP Capital",
      signalType: "Swing",
      search: "PETR",
    });

    // Returns full URL (absolute), not just query string
    expect(url).toContain("/signals?");
    expect(url).toContain("limit=50");
    expect(url).toContain("channel=TP");
    expect(url).toContain("type=Swing");
    expect(url).toContain("search=PETR");
  });

  it("should build URL with only limit parameter", () => {
    const url = buildQuery({ limit: 10 });
    expect(url).toContain("/signals?limit=10");
  });

  it("should skip undefined parameters", () => {
    const url = buildQuery({
      limit: 10,
      channel: undefined,
      signalType: undefined,
    });

    expect(url).toContain("limit=10");
    expect(url).not.toContain("channel");
    expect(url).not.toContain("type");
  });
});
