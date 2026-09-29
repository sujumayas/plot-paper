import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

/** Reads width/height from a PNG's IHDR chunk. */
export function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export async function openBuilder(page: Page, query = "") {
  await page.goto(`/build${query}`);
  await expect(page.locator(".builder[data-ready=true]")).toBeVisible();
  await expect(page.getByTestId("poster").locator("svg")).toBeVisible();
}

export async function posterSvg(page: Page) {
  return page.getByTestId("poster").locator("svg").first();
}

export async function toast(page: Page, text: string | RegExp) {
  await expect(page.locator(".toast").filter({ hasText: text }).first()).toBeVisible();
}
