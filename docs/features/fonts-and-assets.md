# 字体与素材模块

## 模块职责

字体与素材模块负责管理前端展示和 OBS 页面需要使用的本地静态资源，包括字体文件、答谢图片等上传资源，以及后端对这些资源的静态托管。

该模块不是单独的页面功能，而是 OBS 弹幕、答谢页、样式设置等功能的基础支撑。

## 相关文件

### 后端

- `backend/src/routes/fonts.js`：字体列表和上传 API。
- `backend/src/routes/thankyou.js`：答谢素材上传 API。
- `backend/src/server.js`：字体、public 目录和答谢素材静态托管。
- `backend/data/fonts/`：字体文件目录。
- `backend/data/daxie/`：答谢素材目录。
- `backend/public/`：后端 public 静态资源目录。

### 前端

- `frontend/src/pages/ObsSettingsPage.jsx`：OBS 字体配置入口。
- `frontend/src/pages/ThankYouSettingsPage.jsx`：答谢素材上传入口。

## 后端 API

字体路由挂载在 `/api/fonts`：

- `GET /api/fonts`：读取可用字体列表。
- `POST /api/fonts/upload`：上传字体文件。

答谢素材上传：

- `POST /api/thankyou/upload`

## 静态托管路径

`backend/src/server.js` 中托管了几类静态资源：

- `frontend/dist`：生产环境前端页面。
- `backend/public`：后端 public 静态资源。
- `/fonts` -> `backend/data/fonts`：字体文件。
- `/daxie` -> `backend/data/daxie`：答谢素材文件。

## 数据流

```text
前端上传字体或素材
        |
        | /api/fonts/upload 或 /api/thankyou/upload
        v
后端保存到 backend/data/*
        |
        v
前端 / OBS 页面通过静态 URL 引用资源
```

## 字体文件

字体文件通常用于 OBS 弹幕样式配置。上传后，前端可以通过 `/fonts/...` 路径引用字体资源。

注意：字体文件可能较大，不建议把用户上传的运行时字体默认提交到 Git。

## 答谢素材

答谢素材通常保存到 `backend/data/daxie/`，并通过 `/daxie/...` 对外访问。答谢页或 OBS 浏览器源可以直接引用这些 URL。

## 部署注意事项

上传资源属于运行时数据。使用 Docker 或服务器部署时，应持久化挂载：

- `backend/data/`
- `logs/`

否则容器重建或服务迁移后，上传字体、答谢素材和本地配置可能丢失。

## 开发注意事项

- 新增资源类型时，应明确保存目录、访问 URL、是否需要缓存，以及是否需要加入 `.gitignore`。
- OBS 页面引用资源时应使用后端托管路径，避免依赖开发机本地绝对路径。
- 修改静态路径时，需要同步检查前端配置页面、展示页面、Docker volume 和 README/开发文档。
- 上传接口需要考虑文件类型、文件大小、文件名冲突和路径安全。
