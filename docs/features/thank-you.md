# 答谢模块

## 模块职责

答谢模块用于展示和配置礼物答谢相关内容。它支持按房间保存答谢配置、上传答谢素材，并与直播礼物消息处理流程关联。

该模块主要面向 OBS 或浏览器展示场景，用于在收到礼物、上舰等互动事件时展示定制化答谢内容。

## 相关文件

### 后端

- `backend/src/routes/thankyou.js`：答谢 API 和素材上传。
- `backend/src/utils/thankYouStorage.js`：答谢配置存储。
- `backend/src/server.js`：通过 `/daxie` 托管 `backend/data/daxie` 下的上传素材。
- `backend/src/services/roomManager.js`：后台监控时处理礼物等直播消息。

### 前端

- `frontend/src/pages/ThankYouPage.jsx`：答谢展示页。
- `frontend/src/pages/ThankYouPage.css`：答谢展示样式。
- `frontend/src/pages/ThankYouSettingsPage.jsx`：答谢设置页。
- `frontend/src/pages/ThankYouSettingsPage.css`：答谢设置样式。

## 后端 API

答谢路由挂载在 `/api/thankyou`：

- `POST /api/thankyou/upload`：上传答谢相关素材。
- `GET /api/thankyou/:roomId`：读取指定房间答谢配置。
- `POST /api/thankyou/:roomId`：保存指定房间答谢配置。

## 素材访问

上传素材保存在：

```text
backend/data/daxie/
```

后端通过 `/daxie` 静态路径托管该目录。浏览器或 OBS 页面可以通过 `/daxie/...` 访问上传资源。

由于这些素材属于运行时数据，部署时必须持久化 `backend/data/`，否则容器重建或服务迁移后素材会丢失。

## 配置流

```text
ThankYouSettingsPage 编辑配置 / 上传素材
        |
        | /api/thankyou
        v
thankyou.js 路由
        |
        v
thankYouStorage 保存房间配置
        |
        v
ThankYouPage 读取配置并展示
```

## 房间维度配置

答谢配置按 `roomId` 区分。不同直播间可以拥有不同的答谢素材、规则和展示效果。

开发时需要避免把某个房间的配置误认为全局配置。如果后续需要全局默认配置，应明确设计“全局默认 + 房间覆盖”的合并规则。

## 与礼物消息的关系

直播间礼物消息来自实时弹幕或后台监控流程。答谢模块可以基于礼物名称、金额或配置规则决定展示内容。

修改礼物消息结构时，需要同步检查：

- `roomManager.js` 中的消息处理。
- `ThankYouPage.jsx` 的展示逻辑。
- `ThankYouSettingsPage.jsx` 的配置字段。
- `thankYouStorage.js` 的存储结构。

## 开发注意事项

- 上传素材属于运行时数据，需要持久化 `backend/data/`。
- 修改上传路径或静态路径时，需要同步检查 `server.js` 中的 `/daxie` 托管配置。
- 答谢配置按房间区分，开发时不要把单个房间的配置误作为全局配置。
- 如果新增素材类型，需要明确允许的文件类型、大小限制、访问 URL 和缓存策略。
