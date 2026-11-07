import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";

// A small standard ZIP writer keeps the downloadable build reproducible on
// any supported Node installation without requiring Python or a system zip.
const table = Array.from({ length: 256 }, (_, n) => {
  let crc = n;
  for (let i = 0; i < 8; i++)
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function checksum(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const html = await readFile(
  new URL("../dist/guishan-standalone.html", import.meta.url),
);
const instructions = Buffer.from(
  "归山 · 华南山镇 0.2 — 角色生活版\n\n" +
    "解压后，用电脑 Chrome 或 Edge 打开 guishan-standalone.html。\n" +
    "游戏资源全部内嵌，无需安装 Node.js 或启动服务。\n\n" +
    "WASD / 方向键：移动；Shift：小跑；E：靠近互动；空格：暂停；Esc：取消。\n" +
    "右键旋转、滚轮缩放；点击地面或地点导航，也可让人物自动步行。\n" +
    "手机使用左侧摇杆和右侧互动按钮，双指调整镜头。\n\n" +
    "走到外婆的小院门口，按 E 后推门进屋。到灶台做饭，到洗手池洗漱，到床边睡觉。\n" +
    "到米粉铺坐下吃饭，到木作坊帮工。活动结束后才结算，取消不会扣费或获得收益。\n" +
    "阿婆和周师傅中午去广场、晚上回家，开店时间见游戏内指南。每天首次聊天增进关系。\n\n" +
    "进度保存在当前浏览器。保留文件名与位置以继续进度；若浏览器禁止本地文件存档，游戏会提示。\n" +
    "旧版财富、天数和小院修缮记录会自动迁移。当前为单机原型，不含联机或云存档。\n",
  "utf8",
);
const entries = [
  ["guishan-standalone.html", html],
  ["开始试玩.txt", instructions],
];
const locals = [],
  centrals = [];
let offset = 0;
for (const [name, data] of entries) {
  const filename = Buffer.from(name, "utf8"),
    compressed = deflateRawSync(data, { level: 9 }),
    crc = checksum(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x800, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(33, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);
  locals.push(local, filename, compressed);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(33, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, filename);
  offset += local.length + filename.length + compressed.length;
}
const directory = Buffer.concat(centrals),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(entries.length, 8);
end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const zip = Buffer.concat([...locals, directory, end]);
await mkdir(new URL("../downloads/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../downloads/guishan-playable.zip", import.meta.url),
  zip,
);
await writeFile(new URL("../dist/guishan-playable.zip", import.meta.url), zip);
await writeFile(
  new URL("../downloads/guishan-playable.zip.sha256", import.meta.url),
  createHash("sha256").update(zip).digest("hex") + "  guishan-playable.zip\n",
);
console.log(
  "Role-life playable package: downloads/guishan-playable.zip (" +
    zip.length +
    " bytes)",
);
