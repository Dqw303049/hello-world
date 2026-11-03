# 归山 · 华南山镇

一个可以直接在浏览器游玩的低多边形 3D 山镇生活原型，以湖南常德的风物为灵感。包含白墙灰瓦的民居、梯田茶园、石桥溪水、木作坊、米粉铺和老银杏广场。

## 下载后直接试玩

**GitHub 试玩包：** [下载 guishan-playable.zip](downloads/guishan-playable.zip?raw=1)。下载并解压后，用电脑上的 Chrome 或 Edge 打开里面的 `guishan-standalone.html`。预先构建的压缩包保存在仓库的 `downloads/` 目录。

执行 `npm run build:standalone` 可生成 `dist/guishan-standalone.html`。把这个文件下载到电脑后，用 Chrome 或 Edge 打开即可游玩，不需要安装 Node.js 或启动服务。脚本、样式和图标均内嵌在文件中，不依赖联网加载资源。浏览器是否允许本地 HTML 存档取决于其设置；无法保存时游戏会提示。

生成后执行 `npm run test:standalone`，可验证单文件内嵌资源、断网后的 3D 渲染和采茶收入，以及刷新存档。测试用临时本机服务载入同一个 HTML 后断网，不请求外部资源。当前受管 Chromium 禁止 `file://` 导航，因此这里未自动化实测双击打开文件；它与普通浏览器的本地文件权限不同。

云环境里的 5173 端口是云机器内部的开发服务。它不能通过你自己电脑的 `localhost:5173` 访问；只有环境提供端口转发或对外部署地址时，才能在外部浏览器通过网址游玩。云环境暂停或重启后，开发进程也需要重新启动。发布云环境快照与发布公开游戏网站是两个不同的操作。

地图为原创布局；「华南山镇」为游戏内地名，不代表真实行政区或地理测绘结果。模型全部由代码生成，不依赖外部模型、贴图、在线字体或地图 API。

## 启动

需要 Node.js 22.18+（推荐当前环境的 Node.js 24）和 npm。

```sh
cd /workspace/hello-world
npm ci
npm run dev
```

Vite 默认使用 5173 端口。开发服务器在前台持续运行；新任务中需要重新启动。构建与预览：

```sh
npm run build
npm run preview
```

## 怎么玩

- 鼠标左键拖动地图、滚轮缩放、右键旋转；手机单指拖动、双指缩放和旋转。
- 点击建筑、建筑标签或底部地点菜单，打开地点详情并执行活动。
- 采茶获得 ¥45 / 消耗 18 体力；木作获得 ¥68 / 消耗 24 体力。
- 米粉花费 ¥18，恢复 28 体力；也可以吃点心、树下歇脚、溪边煮茶。
- 活动会推进游戏时间。21:00 后无法再安排活动；到外婆的小院睡觉，次日 08:00 恢复满体力。
- 攒够 ¥360 后修缮小院，完成第一个心愿。完成后仍可继续生活和探索。
- 「旅居手账」记录最近 80 件生活小事；「开启新生活」需再次确认才会清空存档。

当前为单机初版，不包含账号、云存档、多人同步或真实天气。游戏状态通过当前浏览器的 `localStorage` 自动保存，刷新后恢复。清除站点数据会删除进度，不同浏览器或设备间不共享。存储被禁用时会明确提示；3D 不可用时仍可通过地点菜单游玩。

## 验证

```sh
npm test          # 5 项游戏规则与存档测试
npm run build    # TypeScript 检查 + 生产构建
npm run test:e2e # Chromium 浏览器测试
```

浏览器测试默认使用 `/usr/bin/chromium`，可通过 `CHROMIUM_PATH` 指向其他 Chromium 可执行文件。非云环境也可以使用 Playwright 安装的 Chromium，并将对应可执行路径传给 `CHROMIUM_PATH`。测试会自动在 5173 端口启动 Vite；覆盖 3D 渲染、地图缩放、移动触摸拖动、赚钱与消费、过夜、修缮、手账、刷新恢复、安全重开，以及无 WebGL 的降级玩法。截图写入被 Git 忽略的 `test-results/`。

## 项目结构

```text
src/App.tsx        界面、地点面板、手账和浏览器存档
src/TownScene.tsx  3D 地形、建筑、植被、溪流、镜头和地图标签
src/game.ts        独立游戏规则与存档校验
src/locations.ts   地点设定、文案和坐标
src/styles.css     桌面与手机布局
tests/             规则测试和浏览器功能测试
```

技术栈：React 19、TypeScript、Vite、Three.js、React Three Fiber、Drei、Lucide 图标。状态规模较小，首版使用 React state，不额外引入状态库。依赖版本由 `package-lock.json` 固定。
