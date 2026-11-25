# 抓宠游戏 · Catch Pet Game

一款**单文件 HTML** 的宝可梦风格「探索 + 抓宠 + 养成 + 道馆 + 联盟大会」网页游戏（当前 **v1.0.0**，首个正式版，承接原内部迭代 `v12 → v108`）。
全部逻辑、样式与图鉴/招式数据均内联在 [`app/site/index.html`](app/site/index.html)（约 1.09 MB，经静态服务压缩传输仅 ~206 KB），零构建依赖，双击打开或启动静态服务即可游玩。

- **在线试玩**：<http://47.105.123.182:8727/>
- **健康检查**：<http://47.105.123.182:8727/health>
- **公开仓库**：<https://github.com/lxnndd/catch-pet-game>（`main` 分支；默认自动部署线上，未要求时不推送 GitHub）

---

## 一、项目总览与接手导航

### 1. 文档导航（`docs/`）

| 文档 | 内容 |
|---|---|
| [`docs/版本迭代说明.md`](docs/版本迭代说明.md) | **v12 → v108 → v1.0.0 完整版本演进**、各阶段核心特性与最新 v97–v1.0.0 明细 |
| [`docs/Bug踩坑与经验记录.md`](docs/Bug踩坑与经验记录.md) | **历史踩坑 #1–#99**（公式、数据管道、状态机、UI 交互、运维脚本避坑） |
| [`docs/部署与运维指南.md`](docs/部署与运维指南.md) | 线上服务器目录、systemd、`server.mjs` 压缩缓存、一键部署与 GitHub 推送 |
| [`docs/数据来源与总表说明.md`](docs/数据来源与总表说明.md) | 多源交叉查证口径、已知数据缺口与 `data/` 目录文件索引 |

### 2. 目录结构

```text
抓宠游戏/
├── README.md                    # 本文件：项目总览、架构与接手指南
├── .gitignore
├── app/                         # ★ 运行与部署产物（直接打进线上包）
│   ├── server.mjs               # 零依赖 Node 静态服务（v1.0.0，支持 Gzip/Brotli 缓存）
│   └── site/
│       ├── index.html           # 游戏唯一主文件（v1.0.0）
│       ├── assets/              # 主页封面 / 标题徽标 / 研究所背景及 world/ 18 张 2.5D 世界图素 WebP
│       └── avatars/             # 1,285 张 128×128 WebP 立绘（按物种 id 命名）
├── docs/                        # 整合后的项目文档（迭代 / 踩坑 / 部署 / 数据）
├── data/                        # 结构化数据 JSON 与宠物/招式/进化总表（.csv / .md / .mjs）
└── tools/                       # 静态体检、一键部署与 GitHub API 推送脚本
    ├── catch-pet-syntax.mjs     # <script> 编译检查 + DOM id / data-close 引用校验
    ├── catch-pet-dupcheck.mjs   # 重复函数 / 同名 var 声明排查（防后定义覆盖）
    ├── catch-pet-check.mjs      # 物种 / 招式 / 进化链数据完整性体检
    ├── catch-pet-deploy.mjs     # 一键打包上传并重启线上 systemd 服务
    ├── deploy-config.json       # SSH 部署配置（勿泄露）
    ├── v96-push-api.mjs         # GitHub API 兜底推送脚本
    └── node_modules/            # 仅保留 ssh2 / ws 等最小工具依赖
```

---

## 二、快速启动与验收

```bash
# 1. 启动本地静态服务（默认 http://127.0.0.1:8727/）
node app/server.mjs

# 2. 改完 app/site/index.html 后必跑的三项静态体检
node tools/catch-pet-syntax.mjs
node tools/catch-pet-dupcheck.mjs
node tools/catch-pet-check.mjs

# 3. 一键部署到线上服务器（打包 app/ → SFTP → 重启 catch-pet.service → /health 自检）
node tools/catch-pet-deploy.mjs
```

> 也可直接用浏览器打开 [`app/site/index.html`](app/site/index.html) 单机运行（除立绘外全部功能零依赖）。

---

## 三、游戏机制与代码架构速览

### 1. 内容规模与世界设定
- **宠物图鉴**：**1,205 只**（宝可梦 #1–1025 全量 + 洛克王国 180 只；普通 1,100 / 传说·幻之 105）
- **招式与进化**：**1,093 个招式**、**567 条进化链**、18 属性完整相克矩阵（双属性倍率相乘）
- **历代 9 大真实版图与重制美术**：`WORLD_GEO` + `WORLD_THEME` 按官方地理重建 **关都→帕底亚 9 区**，配置地区专属草地/树冠（阔叶/松杉/棕榈）/沙滩/浪花海岸/人字顶居民小屋/木栅栏/路牌与木质跨海大桥；解耦生态刷新池与视觉贴图（关都恢复纯正森林平原海岸，不再硬刷假雪/假沙漠），Dial 加权寻路彻底修复半途断路问题
- **道馆与联盟**：**72 座官方道馆（每区 8 座，含阿罗拉大考验 / 伽勒尔竞技场）** + **9 地区专属四天王与冠军**；`mapSeed + world` 确定性快速重建 `350 × 250` 地形（~0.3–0.7 s/区），全部城镇与联盟 100% 徒步可达且零断头路
- **性格系统**：完整引入宝可梦官方 **25 种性格**（5 种平衡型 + 20 种攻/防/特攻/特防/速 `±10%`）

### 2. 核心公式与数值旋钮（均在 `app/site/index.html` 内联 `<script>` 顶部/对应分区）

| 旋钮 / 函数 | 现值 / 公式 | 作用 |
|---|---|---|
| `maxHpAt(sp, lv)` | `floor((2×种族+31)×L/100)+L+10+HP_C`（`HP_C=12`） | 官方 HP 公式 + 新手基数补给 |
| `statVal(sp, key, lv)` | `floor((2×种族+31)×L/100)+5`（`IV=31`） | 官方六维能力值（攻/防/特攻/特防/速） |
| `applyMove` 伤害主体 | `(floor(floor((2L/5+2)×威力×A/D)/50)+2) × DMG_K × e × ...` | `DMG_K=1.2`；默认 85% 单次伤害上限，克制 `e≥2` 或等级差 `≥15` 时豁免 |
| `GROWTH_FN` / `expFromFoe` | 官方六种成长曲线 + 第七世代公式 | 全队共享经验：参战 100%，其余存活队友各 50% |
| `catchProb` | 官方捕获公式（`a=((3H−2C)×cap×球)/3H×状态`） | 睡眠/冰冻 2.5×，其余异常 1.5×；球倍率 1 / 1.5 / 2 |
| `RARITY_W` | `[1, 1, 0.05]` | 野外神兽占比 ~0.5%，且神兽野生等级锁定 `70~100` |
| `wildLvRange` | `<25` 级随出战宠 `±3`，`≥25` 级取地区段 ∩ 进化区间 | 防止低级刷出未达进化等级的进化型 |
| `ENC_RATE` | 高草 0.20 / 雪地·浅水 0.10 / 深海·岩地 0.08 / 花田 0.06 / 草地·沙地 0.05 | 城镇与道路永不遇敌 |

### 3. 单文件 `<script>` 内代码分区（按 `/* SECTION: ... */` 检索）
1. `constants`：地图尺寸、地区等级段 `LV_RANGE`、9 大地区与 72 道馆/9 联盟配置 `WORLD_DATA`、25 种性格表 `TRAITS`、属性克制表 `CHART`、`MOVES`、`SPECIES`、`EVO`
2. `individual pets`：HP/能力值公式、`byId`（`O(1)` 哈希索引）、`newPet`、`freshSave`
3. `save & migrate`：`localStorage` 持久化（`v:5` 存档：`world` / `worldPos` / `mapSeed` / `<world>:<biome>` 徽章 / `leagueIdx` / `champions`）、`load()` 自动迁移旧版性格、关都徽章与重定出生镇坐标
4. `map generation`：`genMap(worldKey)` 按 `WORLD_GEO` 真实海岸轮廓与海湾/山湖分区铺地貌、`MAP_REG` 生态映射、官方路线/桥梁生成与徒步可达性兜底
5. `movement`：水系下水、坐骑加速、地形遇敌、闪光拾取
6. `level & evo`：经验分配、进化检查、技能拖动/长按介绍、4 槽 7 节点学招系统
7. `battle`：12 种附加状态、场地/钉子、蓄力/空中/声音/变身/反击/体重/固定伤害、AI 选招、捕获、道馆与联盟大会流程
8. `HUD / party / dex / shop / hospital`：背包仓库、免费治疗、减法式图鉴筛选
9. `canvas rendering` & `input` & `boot`：主视口与小地图渲染、键鼠/触屏操作、初始化入口

---

## 四、改码纪律（接手必读）

1. **只有一个游戏文件真源**：改动一律落在 [`app/site/index.html`](app/site/index.html)，避免维护多份拷贝造成版本漂移。
2. **改后必跑静态体检**：任何代码/数据修改后务必运行 `syntax` / `dupcheck` / `check` 三个工具脚本（见第二章），防止跨段替换误删函数或同名函数覆盖（详见 [`docs/Bug踩坑与经验记录.md`](docs/Bug踩坑与经验记录.md)）。
3. **待推进功能（来自 v96/v97 遗留）**：存档导入导出码、图鉴名称搜索与已抓筛选、洛克剩余 4 条招式（锁定 / 怨恨 / 冰雹 / 魔法反射）与「抢先一步」伤害实装。
