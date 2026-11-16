# 一日一论文 · PaperDaily

**中文** | [English](README.en.md)

一个只做一件事的科研阅读器：**每天把 Cell / Nature / Science 和一百多本顶刊的最新论文，按你的领域，用中文摆到你面前。** 原生 iOS / Android 应用，Expo（React Native + TypeScript）一套代码两端跑，没有后端、没有账号、没有备案域名。

## 界面

| 论文（领域 / 时间 / 每日精选） | 顶刊（CNS 当期期号与封面） |
|---|---|
| ![](docs/screenshots/home.png) | ![](docs/screenshots/issues.png) |

| 收藏（点星标攒起来的） | 我的（本地阅读统计 + 设置） |
|---|---|
| ![](docs/screenshots/favs.png) | ![](docs/screenshots/me.png) |

> 截图是 390×844 视口下用无头 Chrome 抓的 Web 渲染（React Native Web），与真机同源，用来验证排版和数据链路；真机滚动手感和原生控件更顺。

## 快速开始

```bash
npm install

# 手机预览（推荐先走这条）：手机装 Expo Go，扫终端二维码
npx expo start

# 模拟器（iOS 需 macOS + Xcode）
npm run android
npm run ios
```

> 仓库里没有编译好的 `.apk` / `.ipa`。真机预览走 Expo Go，正式安装包走 EAS Build（见下文）。

## 功能

| Tab | 内容 |
|---|---|
| **论文** | 9 个领域 + **99 个二级子领域**（按题名/摘要打分归类，可从"全部"切到"生命科学 › 神经科学"）；今天 / 3 / 7 / 30 天 + 自定义日期；期刊面板（160 本精选刊，支持简称、ISSN 搜索）+ 全库期刊检索；排序（最新 / 高影响因子）；关键词搜索（输入即联想近两年论文）；**每日精选**（按影响因子和你的领域偏好自动挑 3 篇）；**我的关注**横滑条（关注的刊有新文亮红「新」）；下拉刷新 |
| **顶刊** | Cell / Nature / Science 当期期号、日期、头条与封面，点进去看本期全部文章；每本可 ★ 关注，有新期时卡片上标「新」 |
| **收藏** | 点论文卡片右下角的 ☆ 收藏，整条记录（含摘要）存在本机，断网也能看 |
| **我的** | 累计阅读、今日、连续天数、最近 7 天柱状、领域分布；翻译接口配置；清缓存 |

中英一键切换；中文模式下论文标题与摘要会**自动机翻成中文**（标题直接显示，原文折叠在下面）。

## 几个关键设计

### 为什么选「3 天」真的能看到 3 天的文章

Crossref 只支持按 `created` / `published` 倒序翻页，直接取前 N 条永远只覆盖几小时。所以：

1. **按天分桶**：窗口几天就发几天请求，每天各查一次，保证窗口里每天都有配额；
2. **cursor 深分页**：每天内部用 `cursor=*` 翻到取完（Crossref 的 cursor 翻页不支持 `sort`，会 400，所以不带 sort，取回本地排）；
3. **按发表日期取**：`from-pub-date` / `until-pub-date`，和卡片上显示的日期同一口径；
4. **双口径兜底**：Cell 这类 `published` 只到年月的刊，再用 `from-created-date` 补一轮，只收「年月对得上」的；
5. **按天配额取样**：60 条上限按「60 ÷ 天数」分给每天，否则最热闹的那天会把配额吃光；
6. **按天缓存**：过去的日期缓存 24h，今天 10 分钟。

`src/logic/feed.ts` 负责 1/5/6，`src/api/crossref.ts` 的 `papersInDay` 负责 2/3/4。

### 翻译

默认通道是**腾讯交互翻译**（免密钥、一次可提交多条、国内直连）；失败才落到 MyMemory（匿名约 5k 字符/天）；在设置里填自己的 OpenAI 兼容接口（Base URL / Key / 模型）则优先用它，质量最好。

进入列表即开始联网翻译，8–20 条一批并发；切中文时先读本机译文缓存铺屏（0 请求），只补缺的。译好的永久缓存。断网或额度用尽时保持英文，不弹错。

> 免密钥通道是机器翻译，专业术语可能出现 `MgSc 2 Se 4` 这种断字；要准就配 Key。

## 数据来源

| 用途 | 接口 |
|---|---|
| 论文列表 / 搜索 / 期号 / 本期文章 | `https://api.crossref.org` |
| 期刊全库检索 | `https://api.crossref.org/journals?query=`（不支持 `select`，传了会 400） |
| 摘要补全 | Europe PMC → PubMed（NCBI eutils）→ OpenAlex → Semantic Scholar → Nature 页面 meta（仅 10.1038） |
| 封面图 | Cell `ars.els-cdn.com`、Nature `media.springernature.com`（Science 有 Cloudflare 反爬，走版式封面） |
| 中文翻译 | `transmart.qq.com`（默认）→ `api.mymemory.translated.net`（兜底）→ 自备 OpenAI 兼容接口 |

**没有后端，也不需要备案域名** —— 这是 App 相对小程序最大的一处简化：小程序要配 request 合法域名、要 ICP 备案，App 直接联网即可。

## 目录结构

```
App.tsx                       tab 容器 + 路由（状态式，无导航库）
src/
  api/crossref.ts             Crossref 封装：列表 / 搜索 / 期号 / 本期文章 / 封面推导
  api/europepmc.ts            摘要补全（PubMed / OpenAlex / S2 多源）
  api/translate.ts            OpenAI 兼容 + 腾讯 + MyMemory 三通道翻译
  api/http.ts                 fetch + 超时 + 429 退避 + 限并发
  components/                 PaperCard / DetailModal / PicksCard / JournalPanel / 通用 UI
  data/catalog.ts             ⚠️ 自动生成：160 本刊的 ISSN / 领域 / 影响因子
  data/subdomains.ts          99 个二级方向（中文名 + 英文名 + 判别关键词）
  data/cns-issues.json        ⚠️ 自动生成：CNS 当期快照（scripts/bake-issues.mjs）
  logic/feed.ts               按天分桶、配额取样、缓存
  logic/classify.ts           按 ISSN 归领域，退化到特征词打分；二级方向打分
  logic/picks.ts              每日精选的打分与去重
  logic/follows.ts            关注刊「有新文」判定
  screens/                    PapersScreen / IssuesScreen / IssueScreen / FavoritesScreen / MeScreen / SettingsScreen
  store/storage.ts            AsyncStorage：偏好 / 统计 / 收藏 / 关注 / 缓存
scripts/                      数据烘焙、连通性自检、无头浏览器验收
```

数据没有手抄：`catalog.ts` 由 `scripts/extract-catalog.mjs` 从同作者的微信小程序工程抽取生成（**该工程不在本仓库**，`catalog.ts` 已生成好，直接用即可）。要改数据就改源工程再重新生成。

```bash
node scripts/bake-issues.mjs   # 重烘 CNS 当期快照
node scripts/check-api.mjs     # 验证 Crossref / Europe PMC 可达
```

## 在线构建安装包（GitHub Actions）

仓库自带 `.github/workflows/build.yml`：**推到 master 就自动构建两端**，也可以在 Actions 页面点「Run workflow」手动触发（只改 README / docs 不触发）。

| Artifact | 说明 |
|---|---|
| `PaperDaily-android-apk` | release APK，用 Expo 模板自带的 debug keystore 签名，**下载后直接安装** |
| `PaperDaily-ios-ipa-unsigned` | **未签名** IPA，需要自己签名才能装（Sideloadly / AltStore，或有开发者账号重签） |

下载：Actions → 选一次运行 → 页面底部 Artifacts（保留 90 天）。

- iOS 未签名是因为签名需要 Apple 开发者账号的证书和 provisioning profile，不能放进公开仓库；要出可直装的 ipa 走下面的 EAS Build。
- 自用够了，但**上架要换 keystore**：`android/app/build.gradle` 里 release 默认复用 `signingConfigs.debug`，请生成自己的并改 `signingConfig`。
- 构建流程是 `expo prebuild` 现生成原生工程再编译，仓库里不存 `android/` `ios/` 目录（都在 `.gitignore` 里）。

## 打正式安装包（EAS Build）

本机不需要 Android SDK / Xcode，用 Expo 云构建：

```bash
npm i -g eas-cli
eas login
eas build:configure

eas build -p android --profile preview     # .apk，可直接装
eas build -p android                       # .aab，上 Google Play
eas build -p ios                           # .ipa，需 Apple 开发者账号
```

包名已配好 `com.paperdaily.app`（在 `app.json`，换成你自己的域名倒序）。国内分发可以只出 APK 直接发，不经过商店。

## 图标

`assets/icon.png`（1024）、`assets/android-icon-*.png`（自适应三件套）、`favicon.png`、`splash-icon.png` 全部由 `scripts/make-icon.py` 从同一张源图派生：源图是圆角 + 透明四角的方形海报，而 iOS 要求满幅不透明，所以先按「每行不透明像素的中位色」把四角补齐，再生成各尺寸（安卓前景缩到 67% 居中，留出遮罩裁切余量）。

## 自检

```bash
npm run typecheck              # TypeScript 全量检查（0 错误）
npm run api:check              # Crossref / Europe PMC 是否可达
npx expo export -p android     # 生产包能否构建
```

`scripts/verify-*.cjs` 是一组无头浏览器验收脚本（时间窗严格性、联想面板、四个 tab、收藏、关注角标、顶刊页耗时），跑之前先把 dev server 起在 8082：

```bash
npx expo start --web --port 8082
node scripts/verify-issues-speed.cjs   # 顶刊页三种进入场景的耗时
```

## 已知边界

- **仓库里没有编译好的包**：`.apk` 由 GitHub Actions 构建（见上），`.ipa` 需要自行签名，或用 EAS Build / 本地工具链。
- **CNS 当期数据靠后台刷新**：刷新失败时先显示上次存下的期号，页脚会提示，下拉重试即可。
- **Science 没有真封面**：全站 Cloudflare 挑战，封面 URL 是每期随机 guid、无法从期号推导，只能用版式封面。
- **免密钥翻译有每日配额**：额度用尽时译文暂停、保持英文，恢复后继续；要稳定就配 Key。
- **出版社摘要兜底只在真机生效**：Nature 页面没有 CORS 头，浏览器预览拿不到，手机上正常。
- **领域筛选有取整损失**：先按时间窗拉最新 N 条再本地过滤，冷门领域可能只剩几条，放大时间范围即可。
- **列表上限 60 条**：和小程序版一致，防一次性渲染太多。
- **自定义日期按「发表日期」筛**：Crossref 的区间过滤走「收录日期」，两者会差几天，所以选完日期后本地再按卡片日期收一次。

## License

MIT
