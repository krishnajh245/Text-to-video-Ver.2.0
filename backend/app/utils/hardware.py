import multiprocessing
import platform
import subprocess
import json as _json


def _torch_info():
    try:
        import torch
        cuda = torch.cuda.is_available()
        count = torch.cuda.device_count() if cuda else 0
        gpus = []
        for i in range(count):
            props = torch.cuda.get_device_properties(i)
            gpus.append({
                "id": i,
                "name": torch.cuda.get_device_name(i),
                "capability": getattr(props, 'major', None) and getattr(props, 'minor', None) and [props.major, props.minor],
                "memory": {
                    "total": getattr(props, 'total_memory', 0),
                }
            })
        return {
            "cuda_available": bool(cuda),
            "gpu_count": count,
            "gpus": gpus,
            "versions": {
                "torch": torch.__version__,
                "cuda": getattr(torch.version, 'cuda', None),
                "cudnn": getattr(torch.backends.cudnn, 'version', None) if hasattr(torch.backends.cudnn, 'version') else None,
            }
        }
    except Exception:
        return {"cuda_available": False, "gpu_count": 0, "gpus": []}


def _nvidia_smi_info():
    """Fallback GPU detection via nvidia-smi (no Python deps required)."""
    try:
        # Query name, total memory (MiB), and driver version
        result = subprocess.run([
            'nvidia-smi',
            '--query-gpu=name,memory.total,driver_version',
            '--format=csv,noheader,nounits'
        ], capture_output=True, text=True, timeout=3)
        if result.returncode != 0:
            return None
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        gpus = []
        for idx, line in enumerate(lines):
            # e.g. "NVIDIA GeForce RTX 4080, 16384, 551.61"
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                name, mem_mb, driver = parts[0], parts[1], parts[2]
                try:
                    total_bytes = int(mem_mb) * 1024 * 1024
                except Exception:
                    total_bytes = 0
                gpus.append({
                    'id': idx,
                    'name': name,
                    'driver': driver,
                    'memory': {'total': total_bytes}
                })
        if gpus:
            return {
                'cuda_available': True,
                'gpu_count': len(gpus),
                'gpus': gpus,
                'versions': {'driver': gpus[0].get('driver')}
            }
    except Exception:
        return None
    return None


def get_hardware_info():
    gpu = _torch_info()
    if not gpu.get('cuda_available'):
        alt = _nvidia_smi_info()
        if alt:
            gpu = alt
    return {
        "cpu": {
            "cores": multiprocessing.cpu_count(),
            "threads": multiprocessing.cpu_count(),
            "model": platform.processor(),
        },
        "gpu": gpu,
    }


def estimate_performance():
    info = get_hardware_info()
    if info["gpu"].get("cuda_available") and info["gpu"].get("gpu_count", 0) > 0:
        # Simple heuristic by VRAM
        total_vram = sum(g.get("memory", {}).get("total", 0) for g in info["gpu"].get("gpus", []))
        gb = total_vram / (1024**3) if total_vram else 0
        if gb >= 16:
            return {"performance_level": "high", "estimated_time": "30-60 seconds"}
        elif gb >= 8:
            return {"performance_level": "medium", "estimated_time": "1-2 minutes"}
        else:
            return {"performance_level": "low", "estimated_time": "2-5 minutes"}
    # CPU fallback
    cores = info["cpu"].get("cores", 1)
    if cores >= 8:
        level = "low-medium"; eta = "5-10 minutes"
    elif cores >= 4:
        level = "low"; eta = "10-20 minutes"
    else:
        level = "very-low"; eta = "20+ minutes"
    return {"performance_level": level, "estimated_time": eta}
