# 江南夜雨第二版素材记录

使用内置 imagegen 工具。底图是对第一版房间的局部编辑；船是使用同一房间为风格和视角参考生成的透明切片。原始版本保留，不覆盖第一版。

保存位置：

- `assets/images/space-cafe/jiangnan-night-plate-v2.png`：1932×814，去掉船与局部倒影的河面底图。
- `assets/images/space-cafe/jiangnan-boat-v2.png`：2172×724，带透明通道的老人、灯和木船。

网页使用 Hugo 生成的 WebP，船缩至 900 像素宽并保留透明通道。位置、速度、水波、雾和落雨由页面绘制；显示器里的工作区由真实页面投影，不包含在图片中。

## 底图提示词

Use case: precise-object-edit. Edit target is the attached existing Jiangnan night cafe image. This is a strictly registered background plate for a live website, not a redesign. Remove ONLY the small wooden boat, old fisherman, oar, onboard lantern and their immediate wake/reflection outside the window (the boat currently lies around 72-84% across and 37-49% down). Reconstruct the blue rainy river and distant lantern reflections naturally in that tiny area. Leave absolutely EVERYTHING else in exactly the same position, scale, framing, perspective, texture and lighting: all wooden interior, blinds, white shoji side panels, iMac with its existing screen, desk keyboard mouse, blank tablet, fan, shelves, chair, windows, willow, distant bridge, houses, mountains, mist and rain. Same panoramic 1933 by 814 composition/aspect. Do not brighten or recolor. No added boat, person, props, text or watermark. This clean river area will receive an independently moving boat later.

## 船的提示词

Use case: background-extraction / compositing. The attached panoramic cafe image is a style and perspective reference. Create ONLY the small complete old Chinese fisherman and his narrow weathered wooden sampan as an isolated realistic alpha cutout on a genuinely transparent background, with ample transparent padding and no scene behind it. Same small boat as seen on the river from this cafe window: slightly elevated side view, dark timber hull long horizontal silhouette, tiny old man in a muted dark blue grey rain cape and conical straw rain hat, calmly and elegantly sculling a long wooden oar. One very small amber lantern on the boat casting a restrained warm glow on wood. Bow points LEFT; fisherman positioned toward the right stern, facing left, no sail or canopy, no other people. Photorealistic cinematic twilight, cool blue atmospheric edge light with subtle warm lantern, natural worn wood and coarse cloth. Whole boat, hat, person, oar and bow fully in frame, horizontal composition roughly 3:1, transparent outside silhouette. NO river patch, water surface, rectangular background, scenery, sky, land, clouds, frame, white border, cast studio shadow, lettering or watermark. This will be composited at about 230px wide over the rainy blue river in the reference, so keep silhouette calm, distant and tasteful rather than caricature or illustration.
