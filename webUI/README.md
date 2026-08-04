# Klein Canvas Web UI

面向 `API_test_0729_eport_api.json` 工作流的本地生图页面。页面通过同源代理访问 ComfyUI，因此不需要为 ComfyUI 开启 CORS。

## 启动

先确认 ComfyUI 正在 `127.0.0.1:8188` 运行，然后执行：

```bash
cd /home/huyanwei/projects/ComfyUI/webUI
python server.py
```

浏览器打开：

```text
http://127.0.0.1:5173
```

如果 ComfyUI 使用了其他地址：

```bash
python server.py --comfy-url http://127.0.0.1:8189
```

如需从局域网访问页面：

```bash
python server.py --host 0.0.0.0
```
