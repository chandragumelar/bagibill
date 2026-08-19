import { describe, expect, it } from "vitest";
import { cryptoIdGenerator, createSequentialIdGenerator } from "./id";

// spec.md 4.1: group slug is 22 base62 characters from a CSPRNG. The task
// brief sketched 12 chars from a collision-safe alphabet; spec.md wins
// (see K-decision in progress.md).
const SPEC_SLUG_LENGTH = 22;

describe("cryptoIdGenerator", () => {
  it("produces a slug of the length spec.md 4.1 requires", () => {
    expect(cryptoIdGenerator.nextSlug()).toHaveLength(SPEC_SLUG_LENGTH);
  });

  it("produces a slug made only of base62 characters", () => {
    expect(cryptoIdGenerator.nextSlug()).toMatch(/^[0-9A-Za-z]+$/);
  });

  it("produces a different id on successive calls", () => {
    expect(cryptoIdGenerator.nextId()).not.toBe(cryptoIdGenerator.nextId());
  });

  it("produces a different slug on successive calls", () => {
    expect(cryptoIdGenerator.nextSlug()).not.toBe(cryptoIdGenerator.nextSlug());
  });
});

describe("createSequentialIdGenerator", () => {
  it("produces predictable, increasing ids", () => {
    const generator = createSequentialIdGenerator("member-");
    expect(generator.nextId()).toBe("member-1");
    expect(generator.nextId()).toBe("member-2");
  });

  it("produces predictable, increasing slugs, counted independently from ids", () => {
    const generator = createSequentialIdGenerator();
    expect(generator.nextId()).toBe("1");
    expect(generator.nextSlug()).toBe("slug1");
    expect(generator.nextSlug()).toBe("slug2");
  });
});
