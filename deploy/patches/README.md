# 第三方节点修复

`hypir-report-errors.patch` 对应 Comfyui-HYPIR 提交 `5118cd619a83` 的 `hypir_advanced_node.py`。

原实现捕获加载/推理错误后返回输入图，使 API 任务错误地显示 success。补丁改为抛出错误，并在推理失败后释放实例引用。原目录已应用补丁；`deploy/build.sh` 会检查并幂等应用，源码不匹配时停止构建，不覆盖未知改动。

```bash
git -C custom_nodes/Comfyui-HYPIR apply --check "$PWD/deploy/patches/hypir-report-errors.patch"
git -C custom_nodes/Comfyui-HYPIR apply "$PWD/deploy/patches/hypir-report-errors.patch"
.venv/bin/python -m pytest -q tests-unit/deployment_test/test_hypir_errors.py
```

缺少基础模型时显式运行 `script_examples/prepare_hypir_model.py`。下载清单固定到 `sd2-community/stable-diffusion-2-1-base` 的 `4e63672c03103b6c636b8fb4119ba982469b2955`；大文件可从 ModelScope 同名镜像取得，但必须与固定清单的 SHA-256 相同。下载校验后才将完整目录发布到 `models/HYPIR/stable-diffusion-2-1-base`。镜像是社区存档，来源和模型许可随模型目录保留，不代表 Stability AI 维护该镜像。
