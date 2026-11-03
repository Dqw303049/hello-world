import type { ActionId, LocationId } from "./game";

export interface TownLocation {
  id: LocationId;
  name: string;
  short: string;
  category: string;
  description: string;
  host: string;
  quote: string;
  position: [number, number, number];
  color: string;
  actions: ActionId[];
}

export const LOCATIONS: TownLocation[] = [
  {
    id: "home",
    name: "外婆的小院",
    short: "我的小院",
    category: "山居日常",
    description:
      "白墙灰瓦，木门吱呀。门口的桂花树还和小时候一样，等你把这间老屋慢慢安顿成家。",
    host: "外婆",
    quote: "回来就好，日子慢慢过。",
    position: [-8, 0.8, 7.5],
    color: "#b78162",
    actions: ["rest", "renovate"],
  },
  {
    id: "tea",
    name: "云边茶园",
    short: "云边采茶",
    category: "劳动 · 收入",
    description:
      "沿着山坡一层层铺开的茶垄，藏着山镇最清新的早晨。帮茶农采一篓茶，也给自己赚一份自在。",
    host: "陈茶农",
    quote: "一芽两叶，轻轻摘，莫着急。",
    position: [-11, 1.7, -7],
    color: "#78904e",
    actions: ["tea"],
  },
  {
    id: "noodles",
    name: "阿婆米粉铺",
    short: "嗦碗米粉",
    category: "街巷美食",
    description:
      "老街拐角飘着牛肉汤的香气。烫一把细粉，浇上热汤，加一勺辣子，就是常德人熟悉的好滋味。",
    host: "刘阿婆",
    quote: "伢儿，粉要趁热嗦！",
    position: [-2.5, 0.8, 7],
    color: "#c28551",
    actions: ["noodles"],
  },
  {
    id: "workshop",
    name: "周记木作坊",
    short: "木作打工",
    category: "手艺 · 收入",
    description:
      "推刨、打磨、上蜡。一张小凳子也有许多讲究。跟着周师傅做点木工，在木头的年轮里找回耐心。",
    host: "周师傅",
    quote: "手上的活慢一点，做出来才扎实。",
    position: [6, 0.8, -6],
    color: "#a47d52",
    actions: ["work"],
  },
  {
    id: "shop",
    name: "山南杂货铺",
    short: "小镇杂货",
    category: "烟火小店",
    description:
      "搪瓷杯、蒲扇、玻璃瓶汽水，货架上装满小镇的生活。今天刚到的桂花糕，隔着油纸都闻得到香。",
    host: "李婶",
    quote: "不买也来坐坐，尝块桂花糕？",
    position: [6.5, 0.8, 6],
    color: "#9d6454",
    actions: ["shop"],
  },
  {
    id: "square",
    name: "老树下的广场",
    short: "树下歇脚",
    category: "慢下来",
    description:
      "老银杏又黄了。街坊坐在树下摆龙门阵，小猫趴在石凳上。找个位置坐坐，听风翻过树叶。",
    host: "街坊们",
    quote: "山里没什么急事，来，坐。",
    position: [-0.5, 0.8, -2.5],
    color: "#b49745",
    actions: ["walk"],
  },
  {
    id: "camp",
    name: "听溪茶寮",
    short: "溪边煮茶",
    category: "山野闲趣",
    description:
      "竹椅摆在溪边，水流绕过青石。不妨煮一壶茶，等一朵云，让心情也跟着溪水舒展开。",
    host: "小溪",
    quote: "今天的云很好看，你发现了吗？",
    position: [13, 0.8, -3],
    color: "#6c9390",
    actions: ["camp"],
  },
];

export function getLocation(id: LocationId): TownLocation {
  return LOCATIONS.find((location) => location.id === id)!;
}
