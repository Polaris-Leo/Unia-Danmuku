# OBS Rendering Precision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 提供兼容旧配置的精确文字效果与 OBS 尺寸对比预览。
**Architecture:** 共享纯函数计算文字效果和预览尺寸；独立数值控件与预览面板接入现有设置页。OBS 实际布局保持由浏览器视口控制。
**Tech Stack:** React 18、CSS、Node test、Playwright；无新增依赖。
**Spec:** docs/superpowers/specs/2026-11-13-obs-rendering-design.md

## Global Constraints

- 两模板独立保存；旧配置默认阴影描边；不改 OBS 本地配置、不自动推送远端。
- 输入真实 vh 和行高数值，零值有效，无效输入不能写入 NaN。
- 预览元数据不改变 OBS 浏览器源的实际视口或缩放。

## Review Focus

- 原生模式的主播渐变底层、SC 和表情不能丢失或重复描边：Task 3 浏览器检查。
- 并排比较不能改变保存的模式：Task 3 浏览器检查。
- 源尺寸改变后显示比例和像素估算同步：Task 2 单元测试及 Task 3 浏览器检查。
- 零参数与缺失参数的区别：Task 1 单元测试和 OBS 页面检查。
- 模板切换的元数据隔离、旧字段兼容：Task 3 浏览器检查。

### Task 1: 共享文字效果

Files: frontend/src/utils/obsRendering.js、frontend/test/obs-rendering.test.js、ObsPreview.jsx、ObsDanmakuPage.jsx、ObsTextEffects.css。
Interfaces: `createTextEffectVariables(settings, unit = 'vh')` 返回文字效果 CSS 变量；单位可为 cqh。
- [x] 先写行为测试：零描边/零发光/零阴影结果 none；缺失值使用 0.2/0.7/0.5；原生不生成偏移描边阴影且 stroke 外扩一致；非增强模式保留四向轮廓；两个单位数值一致。
- [x] 运行 `node --test frontend/test/obs-rendering.test.js` 确认失败，然后实现共享计算并替换两个重复生成器；加入原生 CSS，保留渐变层和默认模式。
- [x] 运行同一测试确认通过。

### Task 2: 数值和预览尺寸

Files: 同一工具与测试、ObsNumberSetting.jsx、ObsPreviewPanel.jsx、ObsPreview.jsx/CSS、ObsSettingsPage.jsx/CSS。
Interfaces: `getPreviewGeometry(settings, templateId)` 返回 sourceWidth/sourceHeight/displayWidth/displayHeight/scale；`getDoubleResolution(geometry)` 返回建议源尺寸；`toDisplayPixels(vh, displayHeight)` 返回像素数。
- [x] 补测试并确认失败：2400×3000 显示宽 420 得高 525、5vh 得 26.25px、0.28vh 得 1.47px、建议 840×1050；非法尺寸回退及边界限制。
- [x] 实现真实数值输入、精细步进和像素估算；元数据随模板保存，显示比例锁定。
- [x] 实现预览源尺寸/显示宽度、1:1/适应、背景、双描边对比及两倍建议；ResizeObserver 响应面板变化，避免缩放元素造成虚假滚动范围。
- [x] Node 测试和构建通过。

### Task 3: 页面验收

Files: 临时 Playwright 脚本与截图置于系统临时目录；以上产品文件按结果修正。
- [x] 使用已安装 Playwright（本会话无 Browser 插件）验证普通、主播渐变、SC、气泡和表情；零参数真关闭、切换模式同步、细值保存与独立模板、并排不写模式、尺寸/背景/1:1 滚动。
- [x] 运行前端构建、Node 单元与 OBS API 测试；运行现有测试并记录历史/礼物现有失败。
- [x] 请求一次只读代码审查，处理有依据的阻塞项；保留本地可查看结果，汇报验证与 OBS 使用方式。

## Execution notes

- 2026-11-13：Task 1、2 均先观察新增行为测试失败，再实现；最终 `frontend npm test` 8/8 通过、`npm run build` 通过。
- 浏览器验收使用临时 Playwright 脚本和隔离 API / WebSocket，未覆盖用户保存文件。验证 0.27vh / 1.05 行高保存、主/缩小版隔离、真实键盘逐字输入正负小数、原生/阴影描边、主播渐变上下层、SC/舰长、气泡、零表情尺寸、1:1 滚动、背景、并排不改变保存模式、源尺寸与最终尺寸同步、两倍参考及移动布局。两个描边模式 × 两个显示样式均验证实际 OBS 页面仍填满浏览器视口，不受预览元数据影响；无页面运行时异常。
- 浏览器发现气泡预览仍使用窗口 vh；已限定预览 CSS 作用域并转换为 cqh，保留实际源的 vh 与舰长内部 cqw 布局。
- 只读审查提出键盘输入与两倍建议下限两项问题，已修正并回归；额外修正负零输入过程被数值化的问题，保留浏览器原生编辑状态，失焦时校验。
- `backend node --test test/obs-settings.test.js` 2/2 通过。既有 `npm run test:history` 在 history-organize.test.js:30 失败；`node test/gift-parser.test.js` 在 gift-parser.test.js:76 的未知字段 Buffer/string 断言失败，均为本次前已存在的问题，未改动相关逻辑。
- 本地前后端用于人工对比；OBS 实际合成与缩放滤镜清晰度需要实录观察，本次未改 OBS 配置、未保存新原生模式到用户模板、未推送远端。

## 2026-11-15 描边与 UI 执行记录

- [x] 增加三种描边预设及独立文字对象微调，保留经典/原生模式与旧配置。
- [x] 设置页改成浅色工作台与五类侧栏；调整预览工具、模板切换、保存状态、提示和移动布局，保留原功能。
- [x] 新增预设字段保护及圆润轮廓覆盖测试；只读审查发现单圆环在 2.6vh 字号/0.6vh 描边时导致句号空隙。覆盖测试先失败，再补内圈采样后通过；Chromium 增强/普通模式均复查无原空隙。
- [x] 前端测试 10/10、OBS 模板 API 测试 2/2、生产构建通过，diff 空白检查通过。
- [x] 隔离 API/WebSocket 的 Chromium 回归：三种描边 × 两种显示样式、主播渐变、SC 金额、表情零值、预设保护字号/行距、模板独立、真实小数键盘输入、BLC 导入、三个测试工具、尺寸/背景/1:1、保存失败、复制两模板链接、重置后显式保存与字体 multipart 上传/刷新；均通过，无运行时异常。1920/1280/768/390 宽度无横向溢出。
- [x] 实际本地前后端读入与字体加载正常，截图期间零配置 POST；调试服务保留运行，未改写已保存用户样式、OBS 本地配置，未提交或推送。Chromium 临时脚本和截图保留在系统临时目录。

### 2026-11-15 第二轮描边细化验收

- [x] 先新增两项失败测试（柔化单位、零值、与描边宽度相关的上限、非圆润模式无影响、预设及缺省兼容），再接入采样和柔化参数；最终前端 12/12 通过。
- [x] 增强/普通模式分别使用 84/48 个采样，保留内部覆盖；计算缓存单位圆坐标。设置页新增两类文字独立的边缘柔化调节，显示有效上限与像素估算。
- [x] Browser plugin not available，使用现有 Playwright。完整 Chromium 回归通过：柔化预设、独立保存与模板隔离，三种描边×两种显示样式；源和预览的柔化一致、主播渐变层没有 blur/filter、移动布局无溢出。只读审查对硬边/柔边/超限、增强/普通模式复查，无重要问题。
- [x] 前端生产构建通过；后端 OBS 模板测试 2/2 通过。保留本地调试服务，未写入真实用户模板或 OBS 配置。

### 2026-11-15 兼容回归验收

- [x] Chromium 先复现旧缓存将有效 12vh 字号误转成 1.11vh；统一配置读取并修正后保持 12vh。
- [x] 新增 6 项前端兼容测试，覆盖缺新字段、空/部分配置、0/false/未知字段、明确 px 换算、BLC 大字号原值、显式 vh 及新模式保留；渲染与兼容合计 18/18 通过。BLC 15.7/18.5vh 误换算先失败，去掉全部无标记单位推断后通过，审查无剩余重要问题。
- [x] 新增 API 保存回读兼容和模板隔离测试，后端 3/3 通过；生产构建通过，diff 空白检查通过。
- [x] 隔离 API/缓存的 Chromium 10 种场景（5 类配置×两模板）通过：旧主缓存键、12vh、大字号 BLC、显式 px、部分配置，首次加载零 POST；保存回读字段保留、再次保存不重复换算、源与预览一致、无运行时异常。真实用户配置文件未被本次验收覆盖。

### 2026-11-26 推送前复核

- 用户授权验证后推送。重新运行前端完整测试 18/18、OBS 配置 API 测试 3/3、前端生产构建和 diff 空白检查，全部通过；fetch 后确认当前基点与 origin/main 一致。
- Browser plugin not available，使用隔离 Playwright API/WebSocket 复查旧 API/缓存字段和大字号 BLC 原值、0/false/扩展字段、两模板独立保存、柔化预设、并排预览、1:1 尺寸、桌面/移动布局、三种描边×两种显示样式与主播渐变层，均通过，无运行时异常。测试 POST 全部被隔离路由接管，用户配置文件未被改写。
- 临时浏览器脚本与截图位于系统临时目录，不进入本次提交。既有历史/礼物非 OBS 测试失败记录仍见前文；本轮没有修改这些模块。
