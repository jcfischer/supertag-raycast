import { describe, it, expect } from "bun:test";
import { DisabledProvider } from "../../../web-clipper/ai/providers/disabled";

describe("DisabledProvider", () => {
  it("should be available", async () => {
    const provider = new DisabledProvider();
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it("should return empty result for summarize", async () => {
    const provider = new DisabledProvider();
    const result = await provider.process({
      url: "https://example.com",
      title: "Test",
      content: "Test content",
      operation: "summarize",
    });
    expect(result).toEqual({});
  });

  it("should return empty result for extract-keypoints", async () => {
    const provider = new DisabledProvider();
    const result = await provider.process({
      url: "https://example.com",
      title: "Test",
      content: "Test content",
      operation: "extract-keypoints",
    });
    expect(result).toEqual({});
  });

  it("should return empty result for suggest-tags", async () => {
    const provider = new DisabledProvider();
    const result = await provider.process({
      url: "https://example.com",
      title: "Test",
      content: "Test content",
      operation: "suggest-tags",
    });
    expect(result).toEqual({});
  });
});
