#!/bin/bash
set -euo pipefail

# 目标目录
TARGET_DIR="/home/huyanwei/projects/ComfyUI/custom_nodes"

# 先切换到目标目录，不存在则退出
if [ ! -d "${TARGET_DIR}" ]; then
    echo "错误：目录 ${TARGET_DIR} 不存在，请先创建该目录！"
    exit 1
fi
cd "${TARGET_DIR}" || exit 1

# 去重后的仓库列表
REPO_LIST=(
git@github.com:kijai/ComfyUI-KJNodes.git
git@github.com:rgthree/rgthree-comfy.git
git@github.com:pythongosssss/ComfyUI-Custom-Scripts.git
git@github.com:chflame163/ComfyUI_LayerStyle.git
git@github.com:Acly/comfyui-inpaint-nodes.git
# git@github.com:Acly/comfyui-inpaint-nodes.git
# git@github.com:rgthree/rgthree-comfy.git
# git@github.com:cubiq/ComfyUI_essentials.git
# # git@github.com:chflame163/ComfyUI_LayerStyle.git
# git@github.com:lquesada/ComfyUI-Inpaint-CropAndStitch.git
# # git@github.com:jiandanplus/Comfyui-GLM_Prompt.git
# git@github.com:WASasquatch/was-node-suite-comfyui.git
# git@github.com:kijai/ComfyUI-KJNodes.git
# git@github.com:AlekPet/ComfyUI_Custom_Nodes_AlekPet.git
# git@github.com:pythongosssss/ComfyUI-Custom-Scripts.git
# # git@github.com:petr-pr/ComfyUI-TranslationNode.git
# git@github.com:Suzie1/ComfyUI_Comfyroll_CustomNodes.git
# git@github.com:Kosinkadink/ComfyUI-Advanced-ControlNet.git
# git@github.com:ltdrdata/ComfyUI-Impact-Pack.git
# git@github.com:SipherAGI/comfyui-animatediff.git
# # git@github.com:mingsky-ai/ComfyUI-MingNodes.git
# git@github.com:yolain/ComfyUI-Easy-Use.git
# git@github.com:11dogzi/Comfyui-HYPIR.git
# git@github.com:jtydhr88/ComfyUI-qwenmultiangle.git
# git@github.com:ssitu/ComfyUI_UltimateSDUpscale.git
# git@github.com:kijai/ComfyUI-Florence2.git
# git@github.com:melMass/comfy_mtb.git
# git@github.com:yichengup/Comfyui-Ycanvas.git
# # git@github.com:Acly/krita-ai-diffusion.git
# # git@github.com:alexisrolland/ComfyUI-Blender.git
# git@github.com:Derfuu/Derfuu_ComfyUI_ModdedNodes.git
# git@github.com:MixLabPro/comfyui-mixlab-nodes.git
# git@github.com:cubiq/ComfyUI_IPAdapter_plus.git
# git@github.com:kijai/ComfyUI-SUPIR.git
# git@github.com:chflame163/ComfyUI_LayerStyle_Advance.git
# git@github.com:kaibioinfo/ComfyUI_AdvancedRefluxControl.git
# git@github.com:er1cw00/ComfyUI-tbox.git
git@github.com:chrisgoringe/cg-use-everywhere.git
# git@github.com:Acly/comfyui-tooling-nodes.git
# git@github.com:Fannovel16/comfyui_controlnet_aux.git
# # git@github.com:city96/ComfyUI-GGUF.git
# # git@github.com:nunchaku-ai/ComfyUI-nunchaku.git
# git@github.com:jjkramhoeft/ComfyUI-Jjk-Nodes.git
# git@github.com:theUpsider/ComfyUI-Logic.git
# git@github.com:M1kep/ComfyLiterals.git
# git@github.com:cardenluo/ComfyUI-Apt_Preset.git
)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}===== 当前工作目录：$(pwd) =====${NC}"
echo -e "${GREEN}一共需要处理 ${#REPO_LIST[@]} 个仓库${NC}"
echo "----------------------------------------"

for repo in "${REPO_LIST[@]}"; do
    repo_name=$(basename "${repo}" .git)
    echo -e "${YELLOW}正在检查：${repo_name}${NC}"

    # 关键判断：文件夹存在就跳过
    if [ -d "${repo_name}" ]; then
        echo -e "${YELLOW}【跳过】${repo_name} 已存在，无需克隆${NC}"
        echo "----------------------------------------"
        continue
    fi

    echo "开始克隆：${repo}"
    if git clone "${repo}" "${repo_name}"; then
        echo -e "${GREEN}【成功】${repo_name} 克隆完成${NC}"
    else
        echo -e "${RED}【失败】${repo_name} 克隆出错，请检查网络/SSH密钥${NC}"
    fi
    echo "----------------------------------------"
done

echo -e "${GREEN}所有仓库处理完毕！${NC}"