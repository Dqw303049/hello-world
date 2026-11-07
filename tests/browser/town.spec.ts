import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { SPOTS } from "../../src/world";

async function position(page: Page) {
  return (await page.getByTestId("player-position").textContent())!
    .split(",")
    .map(Number);
}
async function ready(page: Page) {
  await expect(page.getByText("沿着山路，快到家了…")).toBeHidden({
    timeout: 45000,
  });
}
async function go(page: Page, id: string) {
  const s = SPOTS.find((s) => s.id === id)!;
  const mobile = page.getByRole("button", { name: "地点导航", exact: true });
  if (await mobile.isVisible()) await mobile.click();
  else
    await page.getByRole("button", { name: "去哪里逛逛", exact: true }).click();
  await page
    .getByRole("region", { name: "地点导航", exact: true })
    .getByRole("button", { name: "前往" + s.name, exact: true })
    .click();
  await expect
    .poll(
      async () => {
        const [x, z] = await position(page);
        return Math.hypot(x - s.point.x, z - s.point.z);
      },
      { timeout: 45000 },
    )
    .toBeLessThan(0.25);
}
async function interact(page: Page) {
  if (await page.getByRole("button", { name: "互动", exact: true }).isVisible())
    await page.getByRole("button", { name: "互动", exact: true }).click();
  else await page.keyboard.press("e");
}
test("角色真实移动、松键停止、暂停与地图导航", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await ready(page);
  await expect(page.locator("canvas")).toBeVisible();
  const initial = await position(page);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowRight");
  await expect
    .poll(async () => {
      const p = await position(page);
      return Math.hypot(p[0] - initial[0], p[1] - initial[1]);
    })
    .toBeGreaterThan(0.4);
  await page.waitForTimeout(250);
  const stopped = await position(page);
  await page.waitForTimeout(500);
  expect(await position(page)).toEqual(stopped);
  await page.getByRole("button", { name: "暂停游戏", exact: true }).click();
  await page.keyboard.down("w");
  await page.waitForTimeout(600);
  await page.keyboard.up("w");
  expect(await position(page)).toEqual(stopped);
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
  await go(page, "door");
  await page.screenshot({ path: "test-results/life-town.png" });
  await page.getByRole("button", { name: "缩小视角" }).click();
  await page.getByRole("button", { name: "镜头跟随人物" }).click();
  expect(errors).toEqual([]);
});
test("完整日常：进屋、做饭取消与完成、洗漱、睡眠、吃粉、过桥做工与交友", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await ready(page);
  await interact(page);
  await page.getByRole("button", { name: "推门进入小屋" }).click();
  await expect(page.getByTestId("scene")).toHaveText("home");
  await go(page, "stove");
  await interact(page);
  await page.getByRole("button", { name: "做一份家常饭", exact: true }).click();
  await expect(page.getByLabel("正在进行的活动")).toBeVisible();
  await expect(page.getByTestId("money")).toHaveText("¥128");
  await page.getByRole("button", { name: "取消当前活动" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥128");
  await interact(page);
  await page.getByRole("button", { name: "做一份家常饭", exact: true }).click();
  await expect(page.getByTestId("money")).toHaveText("¥122", {
    timeout: 20000,
  });
  await go(page, "sink");
  await interact(page);
  await page.getByRole("button", { name: "洗漱整理", exact: true }).click();
  await expect
    .poll(async () => Number(await page.getByTestId("hygiene").textContent()), {
      timeout: 15000,
    })
    .toBeGreaterThan(98);
  await go(page, "bed");
  await interact(page);
  await page.getByRole("button", { name: "好好睡一觉", exact: true }).click();
  await expect(page.getByLabel("正在进行的活动")).toBeVisible();
  await page.screenshot({ path: "test-results/life-sleep.png" });
  await expect(page.getByTestId("day")).toHaveText("2", { timeout: 20000 });
  await expect(page.getByTestId("energy")).toHaveText("100");
  await page.screenshot({ path: "test-results/life-home.png" });
  await go(page, "exit");
  await interact(page);
  await page.getByRole("button", { name: "走出小屋", exact: true }).click();
  await expect(page.getByTestId("scene")).toHaveText("town");
  await go(page, "noodles");
  await interact(page);
  await page
    .getByRole("button", { name: "来一碗牛肉米粉", exact: true })
    .click();
  await expect(page.getByTestId("money")).toHaveText("¥104", {
    timeout: 20000,
  });
  await go(page, "workshop");
  await interact(page);
  await page.getByRole("button", { name: "和周师傅聊聊", exact: true }).click();
  await page.getByRole("button", { name: "和周师傅聊聊", exact: true }).click();
  await expect(page.getByLabel("正在进行的活动")).toBeHidden({
    timeout: 15000,
  });
  await interact(page);
  await page.getByRole("button", { name: "帮木匠做工", exact: true }).click();
  await page.screenshot({ path: "test-results/life-work.png" });
  await expect(page.getByTestId("money")).toHaveText("¥172", {
    timeout: 20000,
  });
  await page.getByRole("button", { name: "旅居手账", exact: true }).click();
  const journal = page.getByRole("dialog", { name: "旅居手账" });
  await expect(journal.getByText(/和周师傅一起打磨木凳/)).toBeVisible();
  await expect(journal.locator(".friendships")).toContainText("8");
  await journal.getByRole("button", { name: "关闭弹窗" }).click();
  await page.reload();
  await ready(page);
  await expect(page.getByTestId("money")).toHaveText("¥172");
  await expect(page.getByTestId("day")).toHaveText("2");
  expect(errors).toEqual([]);
});
test("手机摇杆实际移动、松手停止，能够进屋和导航到家具", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const before = await position(page);
  const box = (await page
    .getByRole("group", { name: "移动摇杆" })
    .boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 30, y }],
  });
  await page.waitForTimeout(900);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => {
      const p = await position(page);
      return Math.hypot(p[0] - before[0], p[1] - before[1]);
    })
    .toBeGreaterThan(0.4);
  await page.waitForTimeout(300);
  const stopped = await position(page);
  await page.waitForTimeout(500);
  expect(await position(page)).toEqual(stopped);
  await go(page, "door");
  await interact(page);
  await page.getByRole("button", { name: "推门进入小屋" }).tap();
  await expect(page.getByTestId("scene")).toHaveText("home");
  await page.screenshot({ path: "test-results/life-mobile-home.png" });
  await go(page, "stove");
  await interact(page);
  await expect(
    page.getByRole("button", { name: "做一份家常饭" }),
  ).toBeEnabled();
  await page.screenshot({ path: "test-results/life-mobile-interact.png" });
});
test("旧存档保留财富和修缮，无WebGL时仍遵守行走与靠近互动", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      "guishan-life:v1",
      JSON.stringify({
        version: 1,
        day: 3,
        minute: 480,
        money: 456,
        energy: 80,
        mood: 75,
        renovated: true,
        visited: ["home"],
        actions: 1,
        journal: [],
      }),
    );
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type === "webgl" || type === "webgl2") return null;
      return original.call(this, type, ...args);
    } as typeof original;
  });
  const page = await context.newPage();
  await page.goto("/");
  await ready(page);
  await expect(page.getByText("山镇依然在这里")).toBeVisible();
  await expect(page.getByTestId("money")).toHaveText("¥456");
  await expect(page.getByTestId("day")).toHaveText("3");
  await interact(page);
  await page.getByRole("button", { name: "推门进入小屋" }).click();
  await expect(page.getByTestId("scene")).toHaveText("home");
  await go(page, "stove");
  await interact(page);
  await page.getByRole("button", { name: "做一份家常饭" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥450", {
    timeout: 15000,
  });
  await context.close();
});
