import { expect, test } from "@playwright/test";

test("3D 小镇渲染与完整生活循环、手账、刷新存档", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("沿着山路，快到家了…")).toBeHidden({
    timeout: 45000,
  });
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "前往云边茶园" }),
  ).toBeVisible();
  expect(
    await page
      .locator("canvas")
      .evaluate(
        (canvas) => !!(canvas as HTMLCanvasElement).getContext("webgl2"),
      ),
  ).toBe(true);
  await expect(page.getByTestId("money")).toHaveText("¥128");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/town-desktop.png" });

  await page.getByRole("button", { name: "前往云边茶园" }).click();
  await expect(page.getByRole("heading", { name: "云边茶园" })).toBeVisible();
  await page.getByRole("button", { name: "采一篓秋茶" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥173");
  await expect(page.getByTestId("energy")).toHaveText("62");
  await expect(page.getByTestId("clock")).toHaveText("10:00");

  await page.getByRole("button", { name: "打开阿婆米粉铺" }).click();
  await page.getByRole("button", { name: "来一碗牛肉米粉" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥155");
  await expect(page.getByTestId("energy")).toHaveText("90");
  await page.getByRole("button", { name: "打开周记木作坊" }).click();
  await page.getByRole("button", { name: "帮木匠做工" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥223");
  await page.screenshot({ path: "test-results/town-location.png" });

  await page.getByRole("button", { name: "打开外婆的小院" }).click();
  await expect(
    page.getByRole("button", { name: "修缮我的小院" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "好好睡一觉" }).click();
  await expect(page.getByText("第 2 天", { exact: true })).toBeVisible();
  await expect(page.getByTestId("energy")).toHaveText("100");
  await expect(page.getByTestId("clock")).toHaveText("08:00");

  await page.getByRole("button", { name: "旅居手账", exact: true }).click();
  const journal = page.getByRole("dialog", { name: "旅居手账" });
  await expect(journal.getByText(/和周师傅一起打磨木凳/)).toBeVisible();
  await expect(journal.getByText(/嗦完一碗热米粉/)).toBeVisible();
  await journal.getByRole("button", { name: "关闭弹窗" }).click();
  await page.reload();
  await expect(page.getByTestId("money")).toHaveText("¥223");
  await expect(page.getByTestId("energy")).toHaveText("100");
  await expect(page.getByText("第 2 天", { exact: true })).toBeVisible();
  await expect(page.getByText("沿着山路，快到家了…")).toBeHidden({
    timeout: 45000,
  });
  const teaMarker = page.getByRole("button", { name: "前往云边茶园" });
  const beforeZoom = await teaMarker.boundingBox();
  await page.getByRole("button", { name: "放大地图" }).click();
  await expect
    .poll(async () => {
      const after = await teaMarker.boundingBox();
      return Math.abs((after?.x ?? 0) - (beforeZoom?.x ?? 0));
    })
    .toBeGreaterThan(5);
  await page.getByRole("button", { name: "回到小镇全景" }).click();
  await page.getByRole("button", { name: "打开周记木作坊" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "帮木匠做工" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥427");
  await page.getByRole("button", { name: "打开外婆的小院" }).click();
  await page.getByRole("button", { name: "好好睡一觉" }).click();
  await page.getByRole("button", { name: "修缮我的小院" }).click();
  await expect(
    page.getByRole("heading", { name: "山里，终于有了家" }),
  ).toBeVisible();
  await expect(page.getByTestId("money")).toHaveText("¥67");
  await expect(page.getByRole("button", { name: "小院已修缮" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("手机布局支持地点互动、触摸地图与安全重开", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText("沿着山路，快到家了…")).toBeHidden({
    timeout: 45000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("navigation", { name: "小镇地点" }),
  ).toBeVisible();
  const bridgeMarker = page.getByRole("button", { name: "前往山南杂货铺" });
  const beforeDrag = await bridgeMarker.boundingBox();
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 295, y: 555 }],
  });
  for (let i = 1; i <= 6; i++)
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 295 - i * 10, y: 555 - i * 3 }],
    });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => {
      const after = await bridgeMarker.boundingBox();
      return Math.abs((after?.x ?? 0) - (beforeDrag?.x ?? 0));
    })
    .toBeGreaterThan(10);
  await page.getByRole("button", { name: "回到小镇全景" }).tap();
  await page.screenshot({ path: "test-results/town-mobile.png" });
  await page.getByRole("button", { name: "打开山南杂货铺" }).tap();
  await expect(page.getByRole("heading", { name: "山南杂货铺" })).toBeVisible();
  await page.getByRole("button", { name: "买一份桂花糕" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥116");
  await page.screenshot({ path: "test-results/town-mobile-location.png" });
  await page.getByRole("button", { name: "关闭地点详情" }).click();
  await page.getByRole("button", { name: "旅居手账", exact: true }).click();
  await page.getByRole("button", { name: "开启新生活" }).click();
  await expect(
    page.getByRole("dialog", { name: "重新开始生活" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "再想想" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥116");
  await page.getByRole("button", { name: "开启新生活" }).click();
  await page.getByRole("button", { name: "重新开始", exact: true }).click();
  await expect(page.getByTestId("money")).toHaveText("¥128");
  await expect(page.getByText("把日子，")).toBeVisible();
});

test("无 WebGL 时可继续游玩；损坏存档能恢复", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("guishan-life:v1", "{broken-save");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type, ...args);
    } as typeof original;
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByText("山镇依然在这里")).toBeVisible();
  await expect(page.getByTestId("money")).toHaveText("¥128");
  await page.getByRole("button", { name: "打开云边茶园" }).click();
  await page.getByRole("button", { name: "采一篓秋茶" }).click();
  await expect(page.getByTestId("money")).toHaveText("¥173");
  await context.close();
});
