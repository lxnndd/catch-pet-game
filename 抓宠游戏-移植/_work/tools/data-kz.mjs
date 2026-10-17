/* 洛克王国数据源（页游口径 · 21 属性 → 宝可梦 18 属性）
   ⚠ 收录范围：仅 subagent 联网查证报告中逐条列出的宠物（182 条 = 首批 122 + 追加 60），
     名字/洛克属性/进化链等级/可信度均取自报告原文，未凭记忆补任何一只。
   来源：roco.dvg.cn 页游数据库（含官方属性 ID）、wapbaike.baidu.com「属性（游戏《洛克王国》中的机制）」、
        腾讯官方论坛相克帖 17roco.gamebbs.qq.com
   字段：t=映射后的宝可梦属性 · power=原始洛克属性名 · b=血量档位(1~5，本游戏推断) ·
        h=栖息地(按属性推断) · r=稀有度(0野外/1活动VIP超进化/2精灵王年费，官方无此字段) ·
        e=进化[目标,等级] · evoType=level(有官方等级)/missing(未查到等级，等级为本游戏替代值)/none ·
        god=神系标记 · human=人形宠(游戏内剔除) · kzNo=洛克官方编号 */
export const KZ = [{ id: "kz-001",
  n: "喵喵",
  t: ["grass"
  ],
  power: "草系",
  b: 2,
  h: ["forest",
   "flower"
  ],
  r: 0,
  e: ["喵呜",
   16
  ],
  evoType: "level",
  human: false,
  kzNo: "001",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-002",
  n: "喵呜",
  t: ["grass"
  ],
  power: "草系",
  b: 2,
  h: ["forest",
   "flower"
  ],
  r: 0,
  e: ["魔力猫",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "002",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-003",
  n: "魔力猫",
  t: ["grass"
  ],
  power: "草系",
  b: 3,
  h: ["forest",
   "flower"
  ],
  r: 0,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "003",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-004",
  n: "火花",
  t: ["fire"
  ],
  power: "火系",
  b: 2,
  h: ["volcano",
   "desert"
  ],
  r: 0,
  e: ["焰火",
   16
  ],
  evoType: "level",
  human: false,
  kzNo: "004",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-005",
  n: "焰火",
  t: ["fire"
  ],
  power: "火系",
  b: 2,
  h: ["volcano",
   "desert"
  ],
  r: 0,
  e: ["火神",
   36
  ],
  evoType: "level",
  human: false,
  kzNo: "005",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-006",
  n: "火神",
  t: ["fire",
   "flying"
  ],
  power: "火系·翼系",
  b: 3,
  h: ["volcano",
   "desert",
   "plain"
  ],
  r: 0,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "006",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-007",
  n: "水蓝蓝",
  t: ["water"
  ],
  power: "水系",
  b: 2,
  h: ["water",
   "ocean"
  ],
  r: 0,
  e: ["波波拉",
   16
  ],
  evoType: "level",
  human: false,
  kzNo: "007",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-008",
  n: "波波拉",
  t: ["water"
  ],
  power: "水系",
  b: 2,
  h: ["water",
   "ocean"
  ],
  r: 0,
  e: ["水灵",
   36
  ],
  evoType: "level",
  human: false,
  kzNo: "008",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-009",
  n: "水灵",
  t: ["water"
  ],
  power: "水系",
  b: 3,
  h: ["water",
   "ocean"
  ],
  r: 0,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "009",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-010",
  n: "蹦蹦种子",
  t: ["grass",
   "poison"
  ],
  power: "草系·毒系",
  b: 2,
  h: ["forest",
   "flower",
   "mine"
  ],
  r: 0,
  e: ["蹦蹦草",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "010",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-011",
  n: "咔咔羽毛",
  t: ["nor",
   "flying"
  ],
  power: "普通系·翼系",
  b: 2,
  h: ["plain",
   "forest"
  ],
  r: 0,
  e: ["咔咔雀",
   18
  ],
  evoType: "level",
  human: false,
  kzNo: "027",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-012",
  n: "咔咔雀",
  t: ["nor",
   "flying"
  ],
  power: "普通系·翼系",
  b: 2,
  h: ["plain",
   "forest"
  ],
  r: 0,
  e: ["咔咔鸟",
   36
  ],
  evoType: "level",
  human: false,
  kzNo: "027",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-013",
  n: "咔咔鸟",
  t: ["nor",
   "flying"
  ],
  power: "普通系·翼系",
  b: 3,
  h: ["plain",
   "forest"
  ],
  r: 0,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "027",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-014",
  n: "小布石",
  t: ["rock",
   "ground"
  ],
  power: "石系·土系",
  b: 2,
  h: ["mine",
   "desert"
  ],
  r: 0,
  e: ["布莱石",
   16
  ],
  evoType: "level",
  human: false,
  kzNo: "047",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-015",
  n: "布莱石",
  t: ["rock",
   "ground"
  ],
  power: "石系·土系",
  b: 2,
  h: ["mine",
   "desert"
  ],
  r: 0,
  e: ["布莱克岩",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "047",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-016",
  n: "布莱克岩",
  t: ["rock",
   "ground"
  ],
  power: "石系·土系",
  b: 3,
  h: ["mine",
   "desert"
  ],
  r: 0,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "047",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-017",
  n: "阿米亚特",
  t: ["rock",
   "dark"
  ],
  power: "石系·恶魔系",
  b: 2,
  h: ["mine",
   "desert",
   "forest"
  ],
  r: 0,
  e: ["阿米樱",
   30
  ],
  evoType: "level",
  human: false,
  kzNo: "101",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-018",
  n: "阿米樱",
  t: ["rock",
   "dark"
  ],
  power: "石系·恶魔系",
  b: 2,
  h: ["mine",
   "desert",
   "forest"
  ],
  r: 0,
  e: ["罗隐",
   50
  ],
  evoType: "level",
  human: false,
  kzNo: "101",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-019",
  n: "罗隐",
  t: ["rock",
   "dark"
  ],
  power: "石系·恶魔系",
  b: 3,
  h: ["mine",
   "desert",
   "forest"
  ],
  r: 0,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "101",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-020",
  n: "大尾鱼",
  t: ["water"
  ],
  power: "水系",
  b: 2,
  h: ["water",
   "ocean"
  ],
  r: 0,
  e: ["黑当鱼",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "108",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-021",
  n: "迪莫",
  t: ["fairy"
  ],
  power: "光系",
  b: 3,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: ["圣光迪莫",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "137",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-022",
  n: "拉特",
  t: ["elec"
  ],
  power: "电系",
  b: 2,
  h: ["plain",
   "mine"
  ],
  r: 0,
  e: ["酷拉",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "152",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-023",
  n: "酷拉",
  t: ["elec"
  ],
  power: "电系",
  b: 4,
  h: ["plain",
   "mine"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "153",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-024",
  n: "小翼龙",
  t: ["dragon",
   "flying"
  ],
  power: "龙系·翼系",
  b: 2,
  h: ["mine",
   "desert",
   "plain"
  ],
  r: 0,
  e: ["翼龙",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "233",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-025",
  n: "玛雅石像鬼",
  t: ["rock"
  ],
  power: "石系",
  b: 4,
  h: ["mine",
   "desert"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "284",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-026",
  n: "小帕尔萨斯",
  t: ["dark"
  ],
  power: "恶魔系",
  b: 2,
  h: ["mine",
   "forest"
  ],
  r: 0,
  e: ["帕尔萨斯",
   80
  ],
  evoType: "level",
  human: false,
  kzNo: "366",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-027",
  n: "帕尔萨斯",
  t: ["dark"
  ],
  power: "恶魔系",
  b: 5,
  h: ["mine",
   "forest"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "366",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-028",
  n: "阿布",
  t: ["nor"
  ],
  power: "普通系",
  b: 3,
  h: ["plain",
   "forest"
  ],
  r: 1,
  e: ["超能阿布",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "630",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-029",
  n: "超能阿布",
  t: ["nor"
  ],
  power: "普通系",
  b: 3,
  h: ["plain",
   "forest"
  ],
  r: 1,
  e: ["圣龙阿布",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "630",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-030",
  n: "圣龙阿布",
  t: ["dragon"
  ],
  power: "龙系",
  b: 3,
  h: ["mine",
   "desert"
  ],
  r: 1,
  e: ["惊雷阿布",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "630",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-031",
  n: "大耳帽兜",
  t: ["ice"
  ],
  power: "冰系",
  b: 3,
  h: ["snow"
  ],
  r: 1,
  e: ["帽兜娃娃",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "655",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-032",
  n: "帽兜娃娃",
  t: ["ice"
  ],
  power: "冰系",
  b: 3,
  h: ["snow"
  ],
  r: 1,
  e: ["雪影娃娃",
   48
  ],
  evoType: "level",
  human: false,
  kzNo: "655",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-033",
  n: "雪影娃娃",
  t: ["ice"
  ],
  power: "冰系",
  b: 4,
  h: ["snow"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "657",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-034",
  n: "快乐吉他",
  t: ["elec"
  ],
  power: "电系",
  b: 3,
  h: ["plain",
   "mine"
  ],
  r: 1,
  e: ["舞动吉他",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "768",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-035",
  n: "舞动吉他",
  t: ["elec"
  ],
  power: "电系",
  b: 3,
  h: ["plain",
   "mine"
  ],
  r: 1,
  e: ["欢悦吉他",
   60
  ],
  evoType: "level",
  human: false,
  kzNo: "768",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-036",
  n: "欢悦吉他",
  t: ["elec"
  ],
  power: "电系",
  b: 5,
  h: ["plain",
   "mine"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "768",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-037",
  n: "冰龙宝宝",
  t: ["ice",
   "dragon"
  ],
  power: "冰系·龙系",
  b: 5,
  h: ["snow",
   "mine",
   "desert"
  ],
  r: 2,
  e: ["冰龙勇士",
   30
  ],
  evoType: "level",
  human: false,
  kzNo: "802",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-038",
  n: "冰龙勇士",
  t: ["ice",
   "dragon"
  ],
  power: "冰系·龙系",
  b: 5,
  h: ["snow",
   "mine",
   "desert"
  ],
  r: 2,
  e: ["狂战冰龙",
   45
  ],
  evoType: "level",
  human: false,
  kzNo: "802",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-039",
  n: "狂战冰龙",
  t: ["ice",
   "dragon"
  ],
  power: "冰系·龙系",
  b: 5,
  h: ["snow",
   "mine",
   "desert"
  ],
  r: 2,
  e: ["冰龙王",
   60
  ],
  evoType: "level",
  human: false,
  kzNo: "802",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-040",
  n: "冰龙王",
  t: ["ice",
   "dragon"
  ],
  power: "冰系·龙系",
  b: 5,
  h: ["snow",
   "mine",
   "desert"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "802",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-041",
  n: "乐维",
  t: ["fairy"
  ],
  power: "萌系",
  b: 3,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: ["萌哥",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "885",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-042",
  n: "萌哥",
  t: ["fairy"
  ],
  power: "萌系",
  b: 3,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: ["萌之勇者",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "885",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-043",
  n: "萌之勇者",
  t: ["fairy"
  ],
  power: "萌系",
  b: 3,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: ["萌之王者",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "885",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-044",
  n: "萌之王者",
  t: ["fairy"
  ],
  power: "萌系",
  b: 5,
  h: ["flower",
   "plain"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "888",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-045",
  n: "岩铠小将",
  t: ["ground"
  ],
  power: "土系",
  b: 2,
  h: ["desert",
   "mine"
  ],
  r: 0,
  e: ["岩铠斗士",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "891",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-046",
  n: "岩铠斗士",
  t: ["ground"
  ],
  power: "土系",
  b: 2,
  h: ["desert",
   "mine"
  ],
  r: 0,
  e: ["岩铠领主",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "891",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-047",
  n: "岩铠领主",
  t: ["ground"
  ],
  power: "土系",
  b: 4,
  h: ["desert",
   "mine"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "891",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-048",
  n: "萌翼小狮",
  t: ["flying"
  ],
  power: "翼系",
  b: 3,
  h: ["plain",
   "forest"
  ],
  r: 1,
  e: ["棕绒小狮",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "996",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-049",
  n: "棕绒小狮",
  t: ["flying"
  ],
  power: "翼系",
  b: 3,
  h: ["plain",
   "forest"
  ],
  r: 1,
  e: ["银翼狮王",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "996",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-050",
  n: "银翼狮王",
  t: ["flying"
  ],
  power: "翼系",
  b: 5,
  h: ["plain",
   "forest"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "996",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-051",
  n: "火苗虎",
  t: ["fire"
  ],
  power: "火系",
  b: 3,
  h: ["volcano",
   "desert"
  ],
  r: 1,
  e: ["烈焰虎",
   20
  ],
  evoType: "level",
  human: false,
  kzNo: "1080",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-052",
  n: "烈焰虎",
  t: ["fire"
  ],
  power: "火系",
  b: 3,
  h: ["volcano",
   "desert"
  ],
  r: 1,
  e: ["霸金虎",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "1080",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-053",
  n: "霸金虎",
  t: ["fire"
  ],
  power: "火系",
  b: 4,
  h: ["volcano",
   "desert"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "1080",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-054",
  n: "小炎",
  t: ["ground",
   "fire"
  ],
  power: "土系·火系",
  b: 3,
  h: ["desert",
   "mine",
   "volcano"
  ],
  r: 1,
  e: ["大炎",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "1176",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-055",
  n: "大炎",
  t: ["ground",
   "fire"
  ],
  power: "土系·火系",
  b: 3,
  h: ["desert",
   "mine",
   "volcano"
  ],
  r: 1,
  e: ["赤炎守护",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "1176",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-056",
  n: "赤炎守护",
  t: ["ground",
   "fire"
  ],
  power: "土系·火系",
  b: 4,
  h: ["desert",
   "mine",
   "volcano"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "1176",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-057",
  n: "九灵小子",
  t: ["ghost"
  ],
  power: "幽灵系",
  b: 2,
  h: ["mine"
  ],
  r: 0,
  e: ["冥暗使者",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "1467",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-058",
  n: "冥暗使者",
  t: ["ghost"
  ],
  power: "幽灵系",
  b: 2,
  h: ["mine"
  ],
  r: 0,
  e: ["冥暗领主",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "1467",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-059",
  n: "冥暗领主",
  t: ["ghost"
  ],
  power: "幽灵系",
  b: 2,
  h: ["mine"
  ],
  r: 0,
  e: ["冥暗幽王",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "1467",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-060",
  n: "冥暗幽王",
  t: ["ghost"
  ],
  power: "幽灵系",
  b: 5,
  h: ["mine"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "1467",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-061",
  n: "艾米",
  t: ["fairy"
  ],
  power: "光系",
  b: 3,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: ["星光艾米",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "1500",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-062",
  n: "星光艾米",
  t: ["fairy"
  ],
  power: "光系",
  b: 3,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: ["光明女神艾米",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "1500",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-063",
  n: "光明女神艾米",
  t: ["fairy"
  ],
  power: "光系",
  b: 4,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "1500",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-064",
  n: "冰稚鸟",
  t: ["ice",
   "flying"
  ],
  power: "冰系·翼系",
  b: 5,
  h: ["snow",
   "plain",
   "forest"
  ],
  r: 2,
  e: ["冰凌魔雉",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "1525",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-065",
  n: "冰凌魔雉",
  t: ["ice",
   "flying"
  ],
  power: "冰系·翼系",
  b: 5,
  h: ["snow",
   "plain",
   "forest"
  ],
  r: 2,
  e: ["魔晶凤凰",
   60
  ],
  evoType: "level",
  human: false,
  kzNo: "1525",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-066",
  n: "魔晶凤凰",
  t: ["ice",
   "flying"
  ],
  power: "冰系·翼系",
  b: 5,
  h: ["snow",
   "plain",
   "forest"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "1525",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-067",
  n: "镇狱修罗王",
  t: ["fire"
  ],
  power: "神火系",
  b: 5,
  h: ["volcano",
   "desert"
  ],
  r: 2,
  e: null,
  evoType: "none",
  god: true,
  human: true,
  kzNo: "1731",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-068",
  n: "海皇波塞冬",
  t: ["water"
  ],
  power: "神水系",
  b: 5,
  h: ["water",
   "ocean"
  ],
  r: 2,
  e: null,
  evoType: "none",
  god: true,
  human: true,
  kzNo: "1906",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-069",
  n: "齐天大圣",
  t: ["fight"
  ],
  power: "武系",
  b: 5,
  h: ["mine",
   "plain"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "1960",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-070",
  n: "冒顿",
  t: ["ground"
  ],
  power: "土系",
  b: 4,
  h: ["desert",
   "mine"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "1980",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-071",
  n: "禁魂收割者",
  t: ["grass"
  ],
  power: "神草系",
  b: 5,
  h: ["forest",
   "flower"
  ],
  r: 2,
  e: null,
  evoType: "none",
  god: true,
  human: true,
  kzNo: "2050",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-072",
  n: "九天龙尊",
  t: ["dragon"
  ],
  power: "龙系",
  b: 5,
  h: ["mine",
   "desert"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "2106",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-073",
  n: "惧灵",
  t: ["dark"
  ],
  power: "恶魔系",
  b: 2,
  h: ["mine",
   "forest"
  ],
  r: 0,
  e: ["夜鬼",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2179",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-074",
  n: "夜鬼",
  t: ["dark"
  ],
  power: "恶魔系",
  b: 2,
  h: ["mine",
   "forest"
  ],
  r: 0,
  e: ["不朽领主",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2179",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-075",
  n: "不朽领主",
  t: ["dark"
  ],
  power: "恶魔系",
  b: 2,
  h: ["mine",
   "forest"
  ],
  r: 0,
  e: ["暗夜魔王",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2179",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-076",
  n: "暗夜魔王",
  t: ["dark"
  ],
  power: "恶魔系",
  b: 5,
  h: ["mine",
   "forest"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "2179",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-077",
  n: "若叶蝶",
  t: ["bug"
  ],
  power: "虫系",
  b: 2,
  h: ["forest",
   "flower"
  ],
  r: 0,
  e: ["灵若蝶",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2250",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-078",
  n: "灵若蝶",
  t: ["bug"
  ],
  power: "虫系",
  b: 2,
  h: ["forest",
   "flower"
  ],
  r: 0,
  e: ["兰魅蝶姬",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2250",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-079",
  n: "兰魅蝶姬",
  t: ["bug"
  ],
  power: "虫系",
  b: 4,
  h: ["forest",
   "flower"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "2250",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-080",
  n: "冥古龙",
  t: ["dragon",
   "dark"
  ],
  power: "龙系·恶魔系",
  b: 4,
  h: ["mine",
   "desert",
   "forest"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "2350",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-081",
  n: "鬼火骷髅",
  t: ["ghost",
   "fire"
  ],
  power: "幽灵系·火系",
  b: 2,
  h: ["mine",
   "volcano",
   "desert"
  ],
  r: 0,
  e: ["蓝焰骷髅",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-082",
  n: "蓝焰骷髅",
  t: ["ghost",
   "fire"
  ],
  power: "幽灵系·火系",
  b: 2,
  h: ["mine",
   "volcano",
   "desert"
  ],
  r: 0,
  e: ["骷髅法师",
   48
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-083",
  n: "小武",
  t: ["fight"
  ],
  power: "武系",
  b: 5,
  h: ["mine",
   "plain"
  ],
  r: 2,
  e: ["贤隐武者",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2366",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-084",
  n: "贤隐武者",
  t: ["fight"
  ],
  power: "武系",
  b: 5,
  h: ["mine",
   "plain"
  ],
  r: 2,
  e: ["仁臻武君",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2366",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-085",
  n: "紫薇莨儿",
  t: ["poison"
  ],
  power: "毒系",
  b: 5,
  h: ["forest",
   "mine"
  ],
  r: 2,
  e: ["堇楹仙子",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2379",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-086",
  n: "堇楹仙子",
  t: ["poison"
  ],
  power: "毒系",
  b: 5,
  h: ["forest",
   "mine"
  ],
  r: 2,
  e: ["蔓羽毒后",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2379",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-087",
  n: "蔓羽毒后",
  t: ["poison"
  ],
  power: "毒系",
  b: 5,
  h: ["forest",
   "mine"
  ],
  r: 2,
  e: ["幻鸩毒王",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2379",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-088",
  n: "幻鸩毒王",
  t: ["poison"
  ],
  power: "毒系",
  b: 5,
  h: ["forest",
   "mine"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "2379",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-089",
  n: "快递小哥",
  t: ["steel",
   "flying"
  ],
  power: "机械系·翼系",
  b: 4,
  h: ["mine",
   "plain",
   "forest"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "2543",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-090",
  n: "灵石猴",
  t: ["rock",
   "fire"
  ],
  power: "石系·火系",
  b: 3,
  h: ["mine",
   "desert",
   "volcano"
  ],
  r: 1,
  e: ["踏云猴",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2579",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-091",
  n: "踏云猴",
  t: ["rock",
   "fire"
  ],
  power: "石系·火系",
  b: 3,
  h: ["mine",
   "desert",
   "volcano"
  ],
  r: 1,
  e: ["火云神",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2579",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-092",
  n: "蝴蝶陶陶",
  t: ["fairy",
   "poison"
  ],
  power: "萌系·毒系",
  b: 3,
  h: ["flower",
   "plain",
   "forest"
  ],
  r: 1,
  e: ["猫老大",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2580",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-093",
  n: "猫老大",
  t: ["fairy",
   "poison"
  ],
  power: "萌系·毒系",
  b: 3,
  h: ["flower",
   "plain",
   "forest"
  ],
  r: 1,
  e: ["猫老爷",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2580",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-094",
  n: "幻象勇士",
  t: ["steel"
  ],
  power: "机械系",
  b: 3,
  h: ["mine"
  ],
  r: 1,
  e: ["幻象骑士",
   null
  ],
  evoType: "missing",
  human: true,
  kzNo: "2582",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-095",
  n: "幻象骑士",
  t: ["steel"
  ],
  power: "机械系",
  b: 3,
  h: ["mine"
  ],
  r: 1,
  e: ["幻影霸主",
   null
  ],
  evoType: "missing",
  human: true,
  kzNo: "2582",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-096",
  n: "幻影霸主",
  t: ["steel"
  ],
  power: "机械系",
  b: 3,
  h: ["mine"
  ],
  r: 1,
  e: ["幻影天主",
   null
  ],
  evoType: "missing",
  human: true,
  kzNo: "2582",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-097",
  n: "破晓凯瑞尔",
  t: ["fairy"
  ],
  power: "光系",
  b: 5,
  h: ["flower",
   "plain"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "2585",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-098",
  n: "小凡",
  t: ["nor"
  ],
  power: "普通系",
  b: 5,
  h: ["plain",
   "forest"
  ],
  r: 2,
  e: ["凌霄刀客",
   null
  ],
  evoType: "missing",
  human: true,
  kzNo: "2689",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-099",
  n: "凌霄刀客",
  t: ["nor"
  ],
  power: "普通系",
  b: 5,
  h: ["plain",
   "forest"
  ],
  r: 2,
  e: ["淡意豪杰",
   null
  ],
  evoType: "missing",
  human: true,
  kzNo: "2689",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-100",
  n: "剧毒狼蛛",
  t: ["bug"
  ],
  power: "虫系",
  b: 5,
  h: ["forest",
   "flower"
  ],
  r: 2,
  e: ["恶魔狼蛛",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2750",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-101",
  n: "恶魔狼蛛",
  t: ["bug"
  ],
  power: "虫系",
  b: 5,
  h: ["forest",
   "flower"
  ],
  r: 2,
  e: ["伊莎贝拉",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2750",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-102",
  n: "伊莎贝拉",
  t: ["bug"
  ],
  power: "虫系",
  b: 5,
  h: ["forest",
   "flower"
  ],
  r: 2,
  e: ["噬魂蛛后",
   null
  ],
  evoType: "missing",
  human: false,
  kzNo: "2750",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-103",
  n: "圣湮伊莱娜",
  t: ["steel"
  ],
  power: "机械系",
  b: 5,
  h: ["mine"
  ],
  r: 2,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "2810",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-104",
  n: "紫玉长老",
  t: ["rock",
   "fairy"
  ],
  power: "石系·萌系",
  b: 4,
  h: ["mine",
   "desert",
   "flower"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "3149",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-105",
  n: "地鼠",
  t: ["ground"
  ],
  power: "土系",
  b: 2,
  h: ["desert",
   "mine"
  ],
  r: 0,
  e: ["遁鼠",
   16
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-106",
  n: "遁鼠",
  t: ["ground"
  ],
  power: "土系",
  b: 3,
  h: ["desert",
   "mine"
  ],
  r: 0,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-107",
  n: "格斗小五",
  t: ["fight"
  ],
  power: "武系",
  b: 3,
  h: ["mine",
   "plain"
  ],
  r: 1,
  e: ["格斗小六",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-108",
  n: "格斗小六",
  t: ["fight"
  ],
  power: "武系",
  b: 3,
  h: ["mine",
   "plain"
  ],
  r: 1,
  e: ["格斗小七",
   60
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-109",
  n: "熊猫秀才",
  t: ["fight"
  ],
  power: "武系",
  b: 2,
  h: ["mine",
   "plain"
  ],
  r: 0,
  e: ["功夫熊猫",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-110",
  n: "功夫熊猫",
  t: ["fight"
  ],
  power: "武系",
  b: 2,
  h: ["mine",
   "plain"
  ],
  r: 0,
  e: ["狂暴熊猫",
   60
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-111",
  n: "鬼雾",
  t: ["ghost",
   "poison"
  ],
  power: "幽灵系·毒系",
  b: 2,
  h: ["mine",
   "forest"
  ],
  r: 0,
  e: ["邪雾",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-112",
  n: "邪雾",
  t: ["ghost",
   "poison"
  ],
  power: "幽灵系·毒系",
  b: 2,
  h: ["mine",
   "forest"
  ],
  r: 0,
  e: ["灵雾",
   60
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-113",
  n: "恶魔狼",
  t: ["dark",
   "fairy"
  ],
  power: "恶魔系·萌系",
  b: 3,
  h: ["mine",
   "forest",
   "flower"
  ],
  r: 1,
  e: ["酷酷狼",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-114",
  n: "酷酷狼",
  t: ["dark",
   "fairy"
  ],
  power: "恶魔系·萌系",
  b: 3,
  h: ["mine",
   "forest",
   "flower"
  ],
  r: 1,
  e: ["肌肉狼",
   60
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-115",
  n: "剧毒蛙",
  t: ["poison",
   "water"
  ],
  power: "毒系·水系",
  b: 2,
  h: ["forest",
   "mine",
   "water"
  ],
  r: 0,
  e: ["剧毒蛙王",
   45
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-116",
  n: "小荷",
  t: ["poison",
   "water"
  ],
  power: "毒系·水系",
  b: 2,
  h: ["forest",
   "mine",
   "water"
  ],
  r: 0,
  e: ["蛇娘子",
   30
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-117",
  n: "蛇娘子",
  t: ["poison",
   "water"
  ],
  power: "毒系·水系",
  b: 2,
  h: ["forest",
   "mine",
   "water"
  ],
  r: 0,
  e: ["还愿蛇仙",
   42
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-118",
  n: "还愿蛇仙",
  t: ["poison",
   "water"
  ],
  power: "毒系·水系",
  b: 4,
  h: ["forest",
   "mine",
   "water"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-119",
  n: "螳螂宝宝",
  t: ["bug"
  ],
  power: "虫系",
  b: 2,
  h: ["forest",
   "flower"
  ],
  r: 0,
  e: ["红玉螳螂",
   32
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-120",
  n: "红玉螳螂",
  t: ["bug"
  ],
  power: "虫系",
  b: 2,
  h: ["forest",
   "flower"
  ],
  r: 0,
  e: ["金翼螳螂",
   40
  ],
  evoType: "level",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-121",
  n: "金翼螳螂",
  t: ["bug"
  ],
  power: "虫系",
  b: 4,
  h: ["forest",
   "flower"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: false,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
 { id: "kz-122",
  n: "圣光少校",
  t: ["fairy"
  ],
  power: "光系",
  b: 4,
  h: ["flower",
   "plain"
  ],
  r: 1,
  e: null,
  evoType: "none",
  human: true,
  kzNo: "未查到",
  src: "https://roco.dvg.cn/spirits.php"
 },
  { id: "kz-123", n: "黑当鱼", t: ["water"], power: "水系", b: 3, h: ["water", "ocean"], r: 0, e: null, evoType: "none", human: false, kzNo: "109", src: "https://roco.dvg.cn/spirits.php?sx=3&type=&p=1" },
  { id: "kz-124", n: "龟圣人", t: ["water", "rock"], power: "水系·石系", b: 5, h: ["water", "ocean"], r: 1, e: null, evoType: "none", human: false, kzNo: "2573", src: "https://wapbaike.baidu.com/item/%E9%BE%9F%E5%9C%A3%E4%BA%BA/24227808" },
  { id: "kz-125", n: "卡布托", t: ["rock", "water"], power: "石系·水系", b: 2, h: ["mine", "ocean"], r: 1, e: null, evoType: "none", human: false, kzNo: "068", src: "https://wapbaike.baidu.com/item/%E5%8D%A1%E5%B8%83%E6%89%98" },
  { id: "kz-126", n: "毒蛙", t: ["poison", "water"], power: "毒系·水系", b: 1, h: ["water", "plain"], r: 0, e: ["剧毒蛙", 38], evoType: "level", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%89%A7%E6%AF%92%E8%9B%99/1047406" },
  { id: "kz-127", n: "剧毒蛙王", t: ["poison", "water"], power: "毒系·水系", b: 4, h: ["water", "plain"], r: 0, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%89%A7%E6%AF%92%E8%9B%99/1047406" },
  { id: "kz-128", n: "冰虎宝宝", t: ["ice"], power: "冰系", b: 2, h: ["snow", "mine"], r: 1, e: ["冰晶幼虎", 32], evoType: "level", human: false, kzNo: "618", src: "https://wapbaike.baidu.com/item/%E5%86%B0%E8%99%8E%E5%AE%9D%E5%AE%9D/8187180" },
  { id: "kz-129", n: "冰晶幼虎", t: ["ice"], power: "冰系", b: 3, h: ["snow", "mine"], r: 1, e: ["冰晶古齿虎", 48], evoType: "level", human: false, kzNo: "619", src: "https://wapbaike.baidu.com/item/%E5%86%B0%E8%99%8E%E5%AE%9D%E5%AE%9D/8187180" },
  { id: "kz-130", n: "冰晶古齿虎", t: ["ice"], power: "冰系", b: 4, h: ["snow", "mine"], r: 1, e: ["冰晶风暴虎", null], evoType: "missing", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%86%B0%E8%99%8E%E5%AE%9D%E5%AE%9D/8187180" },
  { id: "kz-131", n: "冰晶风暴虎", t: ["ice"], power: "冰系", b: 5, h: ["snow", "mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%86%B0%E8%99%8E%E5%AE%9D%E5%AE%9D/8187180" },
  { id: "kz-132", n: "幽兰雪魅", t: ["ice"], power: "冰系", b: 4, h: ["snow"], r: 1, e: null, evoType: "none", human: false, kzNo: "1344", src: "https://wapbaike.baidu.com/item/%E9%9B%AA%E5%BD%B1%E5%A8%83%E5%A8%83/1887835" },
  { id: "kz-133", n: "魅影幽兰", t: ["ice"], power: "冰系", b: 4, h: ["snow"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%9B%AA%E5%BD%B1%E5%A8%83%E5%A8%83/1887835" },
  { id: "kz-134", n: "雪影冰灵", t: ["ice"], power: "冰系", b: 4, h: ["snow"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%9B%AA%E5%BD%B1%E5%A8%83%E5%A8%83/1887835" },
  { id: "kz-135", n: "鬼魅雪影", t: ["ice"], power: "冰系", b: 4, h: ["snow"], r: 1, e: null, evoType: "none", human: false, kzNo: "2578", src: "https://wapbaike.baidu.com/item/%E9%AC%BC%E9%AD%85%E9%9B%AA%E5%BD%B1/24617976" },
  { id: "kz-136", n: "圣雪皇灵", t: ["ice", "ghost"], power: "冰系·幽灵系", b: 5, h: ["snow", "mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "2574", src: "https://wapbaike.baidu.com/item/%E5%9C%A3%E9%9B%AA%E7%9A%87%E7%81%B5/24417581" },
  { id: "kz-137", n: "雪精灵", t: ["ice"], power: "冰系", b: 3, h: ["snow", "mine"], r: 1, e: ["圣雪皇灵", null], evoType: "missing", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%9C%A3%E9%9B%AA%E7%9A%87%E7%81%B5/24417581" },
  { id: "kz-138", n: "火云邪神", t: ["rock", "fire"], power: "石系·火系", b: 5, h: ["volcano", "mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "2579", src: "https://wapbaike.baidu.com/item/%E7%81%AB%E4%BA%91%E9%82%AA%E7%A5%9E/54062772" },
  { id: "kz-139", n: "狼烟圣魂", t: ["grass", "fire"], power: "草系·火系", b: 5, h: ["volcano", "forest"], r: 1, e: null, evoType: "none", human: false, kzNo: "2583", src: "https://wapbaike.baidu.com/item/%E7%8B%BC%E7%83%9F%E5%9C%A3%E9%AD%82/50360465" },
  { id: "kz-140", n: "骷髅法师", t: ["ghost", "fire"], power: "幽灵系·火系", b: 4, h: ["volcano", "mine"], r: 1, e: ["诡法师", null], evoType: "missing", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%AC%BC%E7%81%AB%E9%AA%B7%E9%AB%85/1672786" },
  { id: "kz-141", n: "诡法师", t: ["ghost", "fire"], power: "幽灵系·火系", b: 5, h: ["volcano", "mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%AC%BC%E7%81%AB%E9%AA%B7%E9%AB%85/1672786" },
  { id: "kz-142", n: "业炎冥古龙", t: ["dragon", "dark"], power: "龙系·恶魔系", b: 5, h: ["volcano", "mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "2757", src: "https://wapbaike.baidu.com/item/%E5%86%A5%E5%8F%A4%E9%BE%99/8607471" },
  { id: "kz-143", n: "赤毛鸡仔", t: ["fire"], power: "火系", b: 1, h: ["volcano", "plain"], r: 1, e: ["火云斗鸡", null], evoType: "missing", human: false, kzNo: "2018", src: "https://wapbaike.baidu.com/item/%E4%BC%8A%E4%B8%BD%E8%8E%8E%E7%99%BD/20408480" },
  { id: "kz-144", n: "巨石旋风", t: ["rock"], power: "石系", b: 4, h: ["mine", "desert"], r: 1, e: null, evoType: "none", human: false, kzNo: "1029", src: "https://baike.baidu.com/item/%E5%B7%A8%E7%9F%B3%E6%97%8B%E9%A3%8E/55736195" },
  { id: "kz-145", n: "石旋风", t: ["rock"], power: "石系", b: 2, h: ["mine", "desert"], r: 1, e: ["顽石旋风", 32], evoType: "level", human: false, kzNo: "未查到", src: "https://baike.baidu.com/item/%E5%B7%A8%E7%9F%B3%E6%97%8B%E9%A3%8E/55736195" },
  { id: "kz-146", n: "顽石旋风", t: ["rock"], power: "石系", b: 3, h: ["mine", "desert"], r: 1, e: ["巨石旋风", 40], evoType: "level", human: false, kzNo: "未查到", src: "https://baike.baidu.com/item/%E5%B7%A8%E7%9F%B3%E6%97%8B%E9%A3%8E/55736195" },
  { id: "kz-147", n: "玛雅古神像", t: ["rock"], power: "石系", b: 5, h: ["mine", "desert"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E7%8E%9B%E9%9B%85%E7%9F%B3%E5%83%8F%E9%AC%BC/7052720" },
  { id: "kz-148", n: "水晶巨人", t: ["rock", "elec"], power: "石系·电系", b: 5, h: ["mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "1252", src: "https://baike.baidu.com/item/%E6%B0%B4%E6%99%B6%E5%B7%A8%E4%BA%BA" },
  { id: "kz-149", n: "迷嶂布莱岩", t: ["rock", "ground"], power: "石系·土系", b: 5, h: ["mine", "desert"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%B0%8F%E5%B8%83%E7%9F%B3" },
  { id: "kz-150", n: "绿芽粘粘", t: ["ground"], power: "土系", b: 1, h: ["plain", "forest"], r: 0, e: null, evoType: "none", human: false, kzNo: "191", src: "https://baike.baidu.com/item/%E7%BB%BF%E8%8A%BD%E7%B2%98%E7%B2%98/6623571" },
  { id: "kz-151", n: "熔炎领主", t: ["ground", "fire"], power: "土系·火系", b: 5, h: ["desert", "volcano"], r: 1, e: null, evoType: "none", human: false, kzNo: "3198", src: "https://wapbaike.baidu.com/item/%E5%B0%8F%E7%82%8E/55674906" },
  { id: "kz-152", n: "大地鼠", t: ["ground"], power: "土系", b: 2, h: ["desert", "mine"], r: 0, e: null, evoType: "none", human: false, kzNo: "3213", src: "https://roco.dvg.cn/spirits.php?sx=9&type=&p=1" },
  { id: "kz-153", n: "苦行骆驼", t: ["ground"], power: "土系", b: 2, h: ["desert"], r: 0, e: null, evoType: "none", human: false, kzNo: "3222", src: "https://roco.dvg.cn/spirits.php?sx=9&type=&p=1" },
  { id: "kz-154", n: "虎杖", t: ["ground", "dark"], power: "土系·恶魔系", b: 3, h: ["desert", "mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "3281", src: "https://roco.dvg.cn/spirits.php?sx=9&type=&p=1" },
  { id: "kz-155", n: "遮天骨龙", t: ["dragon", "ground"], power: "龙系·土系", b: 5, h: ["mine", "desert"], r: 1, e: null, evoType: "none", human: false, kzNo: "3181", src: "https://roco.dvg.cn/spirits.php?sx=9&type=&p=1" },
  { id: "kz-156", n: "利刺毒蝎", t: ["poison"], power: "毒系", b: 3, h: ["desert", "mine"], r: 1, e: ["剧毒魔蝎", null], evoType: "missing", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%88%A9%E5%88%BA%E6%AF%92%E8%9D%8E/24588819" },
  { id: "kz-157", n: "魔萨尤斯", t: ["poison"], power: "毒系", b: 5, h: ["desert", "mine"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%88%A9%E5%88%BA%E6%AF%92%E8%9D%8E/24588819" },
  { id: "kz-158", n: "风暴酷拉", t: ["elec"], power: "电系", b: 4, h: ["mine", "plain"], r: 1, e: ["疾电酷拉", null], evoType: "missing", human: false, kzNo: "1831", src: "https://wapbaike.baidu.com/item/%E9%85%B7%E6%8B%89/444285" },
  { id: "kz-159", n: "疾电酷拉", t: ["elec"], power: "电系", b: 5, h: ["mine", "plain"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%85%B7%E6%8B%89/444285" },
  { id: "kz-160", n: "电圈怪", t: ["elec", "steel"], power: "电系·机械系", b: 1, h: ["mine", "plain"], r: 0, e: ["电网怪", 30], evoType: "level", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E7%94%B5%E7%BD%91%E6%80%AA/9390360" },
  { id: "kz-161", n: "电网怪", t: ["elec", "steel"], power: "电系·机械系", b: 3, h: ["mine", "plain"], r: 0, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E7%94%B5%E7%BD%91%E6%80%AA/9390360" },
  { id: "kz-162", n: "藤蔓蛋龙", t: ["dragon", "flying"], power: "龙系·翼系", b: 3, h: ["forest", "mine"], r: 1, e: ["藤蔓巨龙", null], evoType: "missing", human: false, kzNo: "281", src: "https://wapbaike.baidu.com/item/%E8%97%A4%E8%94%93%E5%B7%A8%E9%BE%99/49724994" },
  { id: "kz-163", n: "豆豆龙", t: ["steel"], power: "机械系", b: 2, h: ["mine", "plain"], r: 0, e: ["火箭龙", 40], evoType: "level", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E7%81%AB%E7%AE%AD%E9%BE%99/4359956" },
  { id: "kz-164", n: "火箭龙", t: ["steel"], power: "机械系", b: 3, h: ["mine", "plain"], r: 0, e: ["火箭喷射龙", 60], evoType: "level", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E7%81%AB%E7%AE%AD%E9%BE%99/4359956" },
  { id: "kz-165", n: "翼龙", t: ["dragon", "flying"], power: "龙系·翼系", b: 4, h: ["plain", "forest"], r: 0, e: null, evoType: "none", human: false, kzNo: "233", src: "https://wapbaike.baidu.com/item/%E7%BF%BC%E9%BE%99/23726653" },
  { id: "kz-166", n: "小黄蜂", t: ["bug", "flying"], power: "虫系·翼系", b: 1, h: ["forest", "flower"], r: 0, e: ["黄蜂后", 21], evoType: "level", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%BB%84%E8%9C%82%E5%90%8E" },
  { id: "kz-167", n: "黄蜂后", t: ["bug", "flying"], power: "虫系·翼系", b: 3, h: ["forest", "flower"], r: 0, e: null, evoType: "none", human: false, kzNo: "144", src: "https://wapbaike.baidu.com/item/%E9%BB%84%E8%9C%82%E5%90%8E" },
  { id: "kz-168", n: "青龙", t: ["dragon"], power: "龙系", b: 4, h: ["mine", "forest"], r: 1, e: ["神圣青龙", 40], evoType: "level", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E7%A5%9E%E5%9C%A3%E9%9D%92%E9%BE%99/15285732" },
  { id: "kz-169", n: "神圣青龙", t: ["dragon", "elec"], power: "龙系·电系", b: 5, h: ["mine", "forest"], r: 1, e: null, evoType: "none", human: false, kzNo: "1188", src: "https://wapbaike.baidu.com/item/%E7%A5%9E%E5%9C%A3%E9%9D%92%E9%BE%99/15285732" },
  { id: "kz-170", n: "东圣兽青龙", t: ["dragon", "flying"], power: "龙系·翼系", b: 5, h: ["forest", "plain"], r: 1, e: ["东圣兽苍羽", null], evoType: "missing", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E4%B8%9C%E5%9C%A3%E5%85%BD%E9%9D%92%E9%BE%99/23671364" },
  { id: "kz-171", n: "星辰宝宝", t: ["dragon"], power: "龙系", b: 1, h: ["mine", "plain"], r: 1, e: ["银翼天马", null], evoType: "missing", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%93%B6%E7%BF%BC%E5%A4%A9%E9%A9%AC/24592574" },
  { id: "kz-172", n: "银翼天马", t: ["dragon"], power: "龙系", b: 4, h: ["mine", "plain"], r: 1, e: null, evoType: "none", human: false, kzNo: "2305", src: "https://wapbaike.baidu.com/item/%E9%93%B6%E7%BF%BC%E5%A4%A9%E9%A9%AC/24592574" },
  { id: "kz-173", n: "暗夜骷颅", t: ["ghost"], power: "幽灵系", b: 2, h: ["mine", "plain"], r: 0, e: ["夜巨魔", 50], evoType: "level", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E6%9A%97%E5%A4%9C%E9%AA%B7%E9%A2%85/49924818" },
  { id: "kz-174", n: "夜巨魔", t: ["ghost"], power: "幽灵系", b: 4, h: ["mine", "plain"], r: 0, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E6%9A%97%E5%A4%9C%E9%AA%B7%E9%A2%85/49924818" },
  { id: "kz-175", n: "灵雾", t: ["ghost", "poison"], power: "幽灵系·毒系", b: 4, h: ["mine", "plain"], r: 0, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%AC%BC%E9%9B%BE/5518515" },
  { id: "kz-176", n: "超级帕尔萨斯", t: ["dark"], power: "恶魔系", b: 5, h: ["mine", "plain"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%B8%95%E5%B0%94%E8%90%A8%E6%96%AF/8833348" },
  { id: "kz-177", n: "惊雷阿布", t: ["dragon"], power: "龙系", b: 5, h: ["plain", "forest"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E9%98%BF%E5%B8%83/3386798" },
  { id: "kz-178", n: "圣光迪莫", t: ["fairy"], power: "光系", b: 5, h: ["plain", "flower"], r: 1, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E8%BF%AA%E8%8E%AB/10570042" },
  { id: "kz-179", n: "白发懒人", t: ["nor"], power: "普通系", b: 1, h: ["volcano", "plain"], r: 0, e: ["动力猿", 18], evoType: "level", human: false, kzNo: "未查到", src: "https://baike.baidu.com/item/%E7%99%BD%E5%8F%91%E6%87%92%E4%BA%BA" },
  { id: "kz-180", n: "动力猿", t: ["fight", "nor"], power: "武系·普通系", b: 2, h: ["volcano", "plain"], r: 0, e: ["瞌睡王", 36], evoType: "level", human: false, kzNo: "112", src: "https://baike.baidu.com/item/%E5%8A%A8%E5%8A%9B%E7%8C%BF" },
  { id: "kz-181", n: "瞌睡王", t: ["nor"], power: "普通系", b: 3, h: ["volcano", "plain"], r: 0, e: null, evoType: "none", human: false, kzNo: "113", src: "https://baike.baidu.com/item/%E7%9E%8C%E7%9D%A1%E7%8E%8B/9609970" },
  { id: "kz-182", n: "化蝶", t: ["bug", "flying"], power: "虫系·翼系", b: 3, h: ["forest", "flower"], r: 0, e: null, evoType: "none", human: false, kzNo: "未查到", src: "https://wapbaike.baidu.com/item/%E5%8C%96%E8%9D%B6/23732368" },
];

export const KZ_SRC = {
  说明: "《洛克王国》页游口径（21 属性 = 18 常规 + 神火/神水/神草）。本文件只收录联网查证报告中逐条列出的 182 只（首批 122 + 追加 60），未凭记忆扩充。",
  口径: "只用页游，不含手游《洛克王国：世界》（手游把土+石合并为地、另有幻系，体系不同不可混用）。",
  属性归正: "武→fight 翼→flying 土→ground 萌→fairy 机械→steel 光→fairy 幽灵→ghost 恶魔→dark 虫→bug 石→rock，其余同名对应；神火/神水/神草按主系映射并加 god 标记。",
  推断字段: "b(血量档位 1~5)、h(栖息地)、r(稀有度) 均为本游戏推断，洛克官方无对应字段；evoType:'missing' 的条目其进化等级为本游戏替代值，非官方数值。",
  人形过滤: "human:true 共 19 只（人形/拟人化），按用户要求游戏内剔除，本文件保留以便复核。",
  存疑: [
    "页游以「自然进化/超进化/破茧重生/合体」为主，2015 年后多数宠物无官方进化等级，报告写「未查到」，本表标 evoType:missing。",
    "神属性伤害倍率有 1.5 倍与 2 倍两说（百度百科词条自相矛盾），未采信任一方。",
    "已剔除的伪名（查证非洛克宠物）：圣光天马、雷伊、皮皮、闪电鸟、雷丘、小马王、恶魔王、暗黑小龙、巨石怪、冰晶兽、小冰、火苗兽、雷欧。",
    "中文站点页游/手游资料大面积混流，本表只采信报告列出的高可信条目。",
    "覆盖缺口①超能力系(psychic)=0 且无法补：洛克页游 21 属性里没有超能系，属性归正表亦无 psychic 项，手游「幻系」按页游口径已排除；强行给萌系宠改贴 psychic 会让同一洛克属性对应两个键、破坏审查一致性，故不补（若游戏必须要 psychic 宠，只能在映射层把「萌系」再拆一支，数据层保持原样）。",
    "覆盖缺口②本次追加 60 只（kz-123~182，全部 human:false），重点补 snow（冰虎宝宝→冰晶风暴虎、雪影娃娃三超进化、鬼魅雪影、圣雪皇灵、雪精灵）、volcano（火云邪神、狼烟圣魂、骷髅法师/诡法师、业炎冥古龙、赤毛鸡仔）、mine/desert（巨石旋风系、玛雅古神像、水晶巨人、迷嶂布莱岩、遮天骨龙、大地鼠、苦行骆驼、虎杖、利刺毒蝎/魔萨尤斯）、ocean/water（黑当鱼、龟圣人、卡布托、毒蛙、剧毒蛙王）以及电/机械/龙/虫/幽灵的野外与中段形态。",
    "覆盖缺口③仍偏薄的地区：ocean——洛克查无鲸/鲨/海豚类宠，海洋遇敌池只能靠龟圣人、卡布托、黑当鱼、毒蛙系支撑；water——池塘湖泊的纯水系野怪少，多为进化链中段；volcano——火系 r=0 野外宠基本只有火花系与白发懒人系。",
    "覆盖缺口④人形宠按用户要求不再追加：御械女帝、圣尊武王、九天龙尊、破晓凯瑞尔、机甲女王、幻影天主等强宠仍被 human:true 过滤，追加条目无一 human:true。查不到属性或疑似伪名者（巨石怪、冰晶兽、小冰、火苗兽、蜗石贝）一律未收录；属性明确但外形未查到者（火箭龙、蝉翼科尔等）保守判 human:false 后收录。"
  ]
};
