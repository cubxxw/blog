# Space 照片墙与界面精简

用户要求移除左侧格栅窗、“探索房间”和底部阅读／工作区入口，将墙面改成照片墙，并移除桌上竖立的相框。

## 实现

- 左侧纸窗、格栅及其外框移除，用与房间一致的实体抹灰墙封闭开口；主景观窗保持原有玻璃、窗扇和交互。
- 原纸窗位置挂 3 张照片，右墙以 5 张照片替换原单幅装饰画。缩略图和照片 ID 来自已有的旅途相册目录，没有新增外部图片来源。
- 桌上相框、底座、后支架及原桌面交互坐标移除。照片墙每张图片直接打开相册中的对应照片；电脑仍可通过实体点击和键盘打开。
- 删除“探索房间”折叠提示，撤除江南房间底部按钮的展示样式。其他旧场景继续使用各自入口。

## 本地验证

2026-10-24，以下 49 项定向测试全部通过，无跳过：

```sh
node --test scripts/space-jiangnan-room-geometry.test.mjs scripts/space-jiangnan-timber.test.mjs scripts/space-jiangnan.test.mjs scripts/space-jiangnan-alignment.test.mjs scripts/space-window-view.test.mjs scripts/space-jiangnan-furnishings.test.mjs
```

验证覆盖真实 Three.js 网格／射线、照片背后的实体墙、相册 ID 与纹理绑定、桌面支撑、主窗、步行碰撞、木材着色与资源释放。

`git diff --check`、两处修改的 JavaScript 语法检查，以及本机 TypeScript 5.9.3 的项目检查和交互配置检查通过。标准 `npm run typecheck` 的第二条命令因本机旧编译器不支持 `--ignoreConfig` 而失败；去掉该版本不支持的参数后，同一配置检查通过。本轮没有安装或修改依赖，标准命令仍需由锁定依赖的 CI 确认。

## 页面与发布验证

当前本机 `.agent-pause` 仍存在，本轮没有启动本地构建、dev server、浏览器页或委派。新增远端浏览器验收覆盖：底部入口隐藏、两面墙照片的实际手势点击及对应相册标题；截图写入测试输出目录，随 CI 测试产物保留。

远端 CI、截图审查及生产发布状态尚待本轮提交后的实际结果确认，不能用上述本地检查替代。

## 资源归属

没有新增服务、设备、浏览器页或测试数据库；既有未跟踪 `output/` 和其他分支原样保留。没有执行资源清理或进程终止。
