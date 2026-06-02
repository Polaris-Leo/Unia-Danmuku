# OBS 时钟模块

## 模块职责

OBS 时钟模块用于在 OBS 浏览器源中显示可配置的时钟画面。它包含时钟展示页、设置页和后端配置 API。

该模块适合用于直播画面中的时间、日期或样式化时钟展示。

## 相关文件

### 后端

- `backend/src/routes/clock.js`：时钟设置 API。

### 前端

- `frontend/src/pages/ClockPage.jsx`：时钟页面容器。
- `frontend/src/pages/ClockDisplay.jsx`：时钟显示组件。
- `frontend/src/pages/ClockPage.css`：时钟页面样式。
- `frontend/src/pages/ClockSettingsPage.jsx`：时钟设置页。
- `frontend/src/pages/ClockSettingsPage.css`：时钟设置样式。

## 后端 API

时钟路由挂载在 `/api/clock`：

- `GET /api/clock/settings`：读取时钟配置。
- `POST /api/clock/settings`：保存时钟配置。

## 使用方式

OBS 浏览器源可以指向：

```text
http://localhost:5173/clock
```

生产环境下通常使用后端托管后的地址：

```text
http://localhost:<PORT>/clock
```

设置页面地址：

```text
http://localhost:5173/clock-settings
```

## 数据流

```text
ClockSettingsPage 保存配置
        |
        | POST /api/clock/settings
        v
clock.js 保存配置
        |
        v
ClockPage / ClockDisplay 读取配置并显示
```

## 配置存储

时钟配置属于运行时配置，通常保存在 `backend/data/` 下的 JSON 文件中。部署时需要持久化 `backend/data/`，否则时钟样式配置可能在容器重建后丢失。

## 展示实现

- `ClockPage.jsx` 负责页面级加载和布局。
- `ClockDisplay.jsx` 负责实际时间显示。
- `ClockSettingsPage.jsx` 负责配置表单。
- 后端 `clock.js` 提供配置读写接口。

OBS 页面应尽量减少复杂交互，保持持续渲染稳定。

## 开发注意事项

- 修改配置字段时，需要同时检查设置页、展示页和 `clock.js`。
- 如果增加新的时间格式或动画，应确认 OBS 浏览器源性能表现。
- 时钟页面面向 OBS 浏览器源，应避免依赖登录态或需要人工交互的流程。
