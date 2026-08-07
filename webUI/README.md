# ComfyUI Workflow Studio

二次开发、节点适配和问题排查请阅读 [Workflow Studio 二次开发指南](./DEVELOPMENT.md)。

通用的本地 ComfyUI 工作流页面。服务会自动扫描
`user/default/workflows_api/`，前端根据 API 工作流和 ComfyUI 的节点定义生成参数面板。

支持：

- 文本、数值、布尔值和下拉选项
- 单图及多图工作流
- 图片上传和全屏透明蒙版编辑（缩放、画笔、橡皮、撤销与重做）
- `IO_EasyMark` 图片打标工具
- `ScreenShare` 屏幕及摄像头捕获、区域裁剪和画面变化时串行实时运行
- 图片、视频、音频、文件和文本输出；默认突出最终结果并折叠辅助预览
- 点击输出图片可全屏查看、缩放、标注并下载标注版本
- 任务排队、状态轮询、取消和错误展示

## 启动

先启动 ComfyUI HTTPS 服务：

```bash
cd /home/huyanwei/projects/ComfyUI
./restart_comfyui_https.sh
```

再启动 Workflow Studio：

```bash
cd /home/huyanwei/projects/ComfyUI/webUI
python server.py \
  --host 0.0.0.0 \
  --tls-certfile /data_ssd/projects/ComfyUI-certs/comfyui-server.crt \
  --tls-keyfile /data_ssd/projects/ComfyUI-certs/comfyui-server.key
```

浏览器打开：

```text
https://172.18.3.19:5173/
```

屏幕捕获需要安全上下文，因此通过局域网 IP 使用时必须启用 HTTPS。第一次使用前，客户端需要信任 ComfyUI 本地 CA：

```text
/data_ssd/projects/ComfyUI-certs/comfyui-local-ca.crt
```

`ScreenShare` 的“实时运行”会等待上一任务结束，再按 `refresh_rate` 检查下一帧；画面没有明显变化时不会重复提交。点击“设置捕获区域”后，主预览会切换为裁剪后的实时画面，并只提交屏幕或摄像头画面中的选定部分。

## 参数

```text
--host               Web UI 监听地址，默认 127.0.0.1
--port               Web UI 端口，默认 5173
--comfy-url          ComfyUI 地址，默认 https://127.0.0.1:8188
--comfy-ca-cert      验证 ComfyUI HTTPS 的 CA 证书
--workflows-dir      API 工作流目录
--tls-certfile       Web UI HTTPS 证书
--tls-keyfile        Web UI HTTPS 私钥
```

新增或更新工作流后，刷新页面即可重新读取目录。可使用项目根目录下的批量导出脚本更新 API 工作流：

```bash
./export_workflows_api.sh
```
