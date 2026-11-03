# 归山试玩包

下载 `guishan-playable.zip`，解压后，用电脑上的 Chrome 或 Edge 打开 `guishan-standalone.html`。

压缩包包含完整的单文件游戏和一份中文操作说明，不需要安装 Node.js 或启动服务。游戏进度保存在当前浏览器，是否允许本地文件存档取决于浏览器设置。

`guishan-playable.zip.sha256` 记录压缩包的 SHA-256 校验值。包内 HTML 已通过无外部资源请求、断网游玩及刷新存档检查。当前云端受管 Chromium 禁止直接导航到 `file://`，因此本地双击打开的步骤未在该环境中自动化验证。

源码及重新生成单文件 HTML 的步骤见仓库根目录的 README。
