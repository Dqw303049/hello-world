import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";

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
  await page.getByRole("button", { name: "打开云边茶园" }).click();
  await page.getByRole("button", { name: "采一篓秋茶" }).click();
  assert.equal(await page.getByTestId("money").textContent(), "¥173");
  assert.equal(await page.getByTestId("energy").textContent(), "62");
  await context.setOffline(false);
  await page.reload();
  await context.setOffline(true);
  await page.getByTestId("money").waitFor();
  assert.equal(await page.getByTestId("money").textContent(), "¥173");
  assert.deepEqual(errors, []);
  assert.deepEqual(remoteRequests, []);
  console.log(
    "Standalone smoke passed: one embedded HTML document, offline WebGL2 play, tea income, refreshed save, zero external resource requests or page errors. Direct file:// navigation is unavailable under this managed browser policy.",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
