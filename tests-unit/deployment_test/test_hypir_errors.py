"""HYPIR must fail the API task instead of returning the unmodified input."""
import importlib
import sys
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import torch

PLUGIN = Path(__file__).resolve().parents[2] / 'custom_nodes/Comfyui-HYPIR'
if not (PLUGIN / 'hypir_advanced_node.py').is_file():
    pytest.skip('Requires the deployment custom-node source bundle', allow_module_level=True)
sys.path.insert(0, str(PLUGIN))
hypir = importlib.import_module('hypir_advanced_node')


def restore(node):
    return node.restore_image_advanced(
        image=torch.zeros(1, 8, 8, 3), prompt='test', upscale_factor=2,
        seed=-1, model_name='HYPIR_sd2', base_model_path='stable-diffusion-2-1-base',
        model_t=200, coeff_t=100, lora_rank=256, patch_size=512,
        encode_patch_size=512, decode_patch_size=512, batch_size=1,
        unload_model_after=True,
    )


def test_missing_model_fails_instead_of_returning_input():
    node = hypir.HYPIRAdvancedRestoration()
    with patch.object(hypir, 'get_base_model_path', return_value='/missing'), \
         patch.object(node, 'create_enhancer', side_effect=FileNotFoundError('missing weights')):
        with pytest.raises(RuntimeError, match='HYPIR model loading failed'):
            restore(node)


def test_inference_failure_is_reported_and_model_released():
    node = hypir.HYPIRAdvancedRestoration()
    enhancer = Mock()
    enhancer.enhance.side_effect = RuntimeError('inference failed')
    with patch.object(hypir, 'get_base_model_path', return_value='/local'), \
         patch.object(node, 'create_enhancer', return_value=enhancer):
        with pytest.raises(RuntimeError, match='HYPIR restoration failed'):
            restore(node)
    assert node.hypir is None
    assert node.current_config is None
