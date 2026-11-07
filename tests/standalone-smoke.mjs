import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { chromium, expect } from "@playwright/test";

// This managed Chromium disallows file:// navigation. Load the exact same
// standalone document once through loopback, then disconnect the browser.
const html = await readFile(
  new URL("../dist/guishan-standalone.html", import.meta.url),
);
const server = createServer((request, response) => {
  if (request.url !== "/") {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const url = `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  const remoteRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url()) && request.url() !== url)
      remoteRequests.push(request.url());
  });
  await page.goto(url);
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "前往云边茶园" })
    .waitFor({ timeout: 45000 });
  await expect(page.getByText("沿着山路，快到家了…")).toBeHidden();
  assert.equal(
    await page
      .locator("canvas")
      .evaluate((canvas) => !!canvas.getContext("webgl2")),
    true,
  );
  assert.equal(await page.getByTestId("money").textContent(), "¥128");
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  await page.screenshot({
    path: new URL("../test-results/guishan-offline.png", import.meta.url)
      .pathname,
  });
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "推门进入小屋" }).click();
  await expect(page.getByTestId("scene")).toHaveText("home");
  await page.getByRole("button", { name: "走到小屋 · 灶台", exact: true }).click();
  await expect.poll(async () => {
    const [x,z] = (await page.getByTestId("player-position").textContent()).split(",").map(Number);
    return Math.hypot(x - 2.15, z + 0.8);
  }, { timeout: 25000 }).toBeLessThan(0.25);
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "做一份家常饭", exact: true }).click();
  await expect(page.getByTestId("money")).toHaveText("¥122", { timeout: 20000 });
  await context.setOffline(false);
  await page.reload();
  await context.setOffline(true);
  await page.getByTestId("money").waitFor();
  assert.equal(await page.getByTestId("money").textContent(), "¥122");
  assert.equal(await page.getByTestId("scene").textContent(), "home");
  assert.deepEqual(errors, []);
  assert.deepEqual(remoteRequests, []);
  console.log(
    "Role-life standalone passed: offline WebGL2, physical navigation into home and to stove, cooking settlement, refreshed location/save, no external resource requests or page errors. Managed browser policy still disallows direct file:// navigation.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
