"""把 optionA 海报图加工成 App 需要的各尺寸图标。

源图是「圆角 + 四角透明」的海报（1024×1024），而 iOS 图标必须不透明满幅，
所以先把透明角按同一行的底色补齐，再由方形版派生其它尺寸。
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "_data" / "icon" / "optionA-1024.png"
ASSETS = ROOT / "assets"
BG = (20, 40, 92)  # #14285C：源图中心底色，安卓自适应用它做背景


def flatten(path: Path) -> Image.Image:
    """透明角 → 按行取底色补齐，得到不透明方形图"""
    a = np.array(Image.open(path).convert("RGBA"))
    alpha = a[:, :, 3]
    for y in range(a.shape[0]):
        solid = a[y][alpha[y] > 250]
        if not len(solid):
            continue
        col = np.median(solid, axis=0)[:3].astype(np.uint8)
        mask = alpha[y] < 255
        a[y, mask, 0:3] = col
        a[y, mask, 3] = 255
    return Image.fromarray(a, "RGBA").convert("RGB")


def rounded(im: Image.Image, radius_ratio: float = 0.22) -> Image.Image:
    """给方形图套圆角（web favicon 用，方角看着扎眼）"""
    size = im.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=int(size * radius_ratio), fill=255
    )
    out = im.convert("RGBA")
    out.putalpha(mask)
    return out


def main() -> None:
    square = flatten(SRC)

    square.resize((1024, 1024), Image.LANCZOS).save(ASSETS / "icon.png", optimize=True)

    # 安卓自适应图标：内容缩到 ~67% 居中，留出被各种遮罩裁切的余量
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    inner = int(1024 * 0.674)
    art = square.resize((inner, inner), Image.LANCZOS)
    canvas.paste(art, ((1024 - inner) // 2, (1024 - inner) // 2))
    canvas.save(ASSETS / "android-icon-foreground.png", optimize=True)

    Image.new("RGB", (1024, 1024), BG).save(ASSETS / "android-icon-background.png")

    # 主题图标（Android 13 单色）：只留文字形状的白色剪影
    gray = np.array(square.convert("L"))
    sil = np.zeros((*gray.shape, 4), dtype=np.uint8)
    sil[..., 0:3] = 255
    sil[..., 3] = np.where(gray > 120, 255, 0)
    mono = Image.fromarray(sil, "RGBA").resize((1024, 1024), Image.LANCZOS)
    mono.save(ASSETS / "android-icon-monochrome.png", optimize=True)

    # web favicon
    rounded(square.resize((96, 96), Image.LANCZOS)).save(ASSETS / "favicon.png", optimize=True)

    # 启动图：浅色底上放一张圆角深蓝卡片，保留源图的圆角质感
    splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    card = rounded(Image.open(SRC).convert("RGBA").resize((640, 640), Image.LANCZOS))
    splash.paste(card, ((1024 - 640) // 2, (1024 - 640) // 2), card)
    splash.save(ASSETS / "splash-icon.png", optimize=True)

    for f in ["icon", "favicon", "splash-icon", "android-icon-foreground", "android-icon-background", "android-icon-monochrome"]:
        p = ASSETS / (f + ".png")
        print(f, Image.open(p).size, p.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
