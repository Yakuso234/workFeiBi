# 素材来源

本项目为本地个人同人桌宠，非官方产品。

## 初音未来连续帧

- 原作者：stushansusu（涂山苏苏），素材来源 [zhu1090093659/dsh-pet](https://github.com/zhu1090093659/dsh-pet/tree/36f605619bdf5445e84493b7faaf2bbb51077b14/assets/miku)，固定提交 `36f605619bdf5445e84493b7faaf2bbb51077b14`，原作者贡献记录 [dsh-web #1031](https://github.com/zhu1090093659/dsh-web/pull/1031)。
- `assets/miku/thumb/` 九轨 40 张 WebP 均为 1024×1024 且带透明通道，原文件不修改；另含原始预览图、`pet.json`、完整 `THIRD_PARTY_NOTICES.md` 和 `UPSTREAM-LICENSE`。40 帧合计 6,136,900 字节，完整接入目录 6,320,344 字节。
- 图片 MIT 许可由原始 pet.json 和 THIRD_PARTY_NOTICES 中的作者声明及 Copyright (c) 2026 stushansusu 全文支持；上游根 LICENSE 是 Apache-2.0，属上游代码，不能冒称图片 MIT。这里只下载素材，没有复制上游程序或运行时。
- This desktop companion features an adaptation of Hatsune Miku, © Crypton Future Media, Inc. 2007, licensed under [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/). 角色权利与作者画作权利分开，本项目维持个人非商业同人用途、不售卖或冒称官方。依据 [Piapro 官方创作者说明](https://piapro.net/intl/en_for_creators.html)，角色条件不覆盖他人歌曲、声库、视频或二创画作本身；作者对本套图的许可另保留在 NOTICE 中。
- 仅播放白名单 idle/happy/blink1/blink2/sleep/angry/scratch/drag/standup，200ms/帧。原始 pet.json 中 work/eat/shop/flirty 等描述仅保留来源上下文，不表示已接入；其文件未下载。沒有 back/turn 或专门 wave 轨，初音隐藏转身，挥手按钮显示「挠挠头」。不把正面翻转冒称背面，也未附带初音歌曲/采样语音。

## 原创发条鸮

v1.3 的发条鸮由 `src/owl.js` 内的 SVG 和 `src/owl.css` 关节动效代码绘制。翅膀、脚、眼皮、头部及后背为独立图层，不使用第三方人物位图或采样语音；v1.4 增加原创霓虹/月光配色、星星发夹与耳机，前后均跟随模型。默认电子提示音由 Web Audio 合成。此项与下述菲比/弗糯糯素材来源分开记录，不将既有素材的许可自动套用于新形象。

## 菲比原始素材

- 原始 `assets/images/phoebe_0.png`、`phoebe_1.png`、`phoebe_2.png` 与 `assets/audio/phoebe_chubby_0.mp3`：Genius-Society/phoebe_chubby，https://github.com/Genius-Society/phoebe_chubby 。仓库许可证 CC BY-NC-SA 4.0，完整文本保留于 ASSET-LICENSE.txt。原 README 注明表情来自库街区，角色权利归 KURO GAMES；语音来源包括 BV1PAPSzuEQ8、BV1EcPaz2EY7、BV1cZ5L6DEQN、BV19mGp6QEs1、BV1XD9FBdEg8、BV1upLm6oEEt 及 https://soundinstants.com/zh/sound/phoebechubby 。原始文件未修改。

保留三张 500×500 透明图与 `phoebe_chubby_0.mp3`。原文件像素未改动，眨眼覆盖、位移和旋转由程序实现。没有原作者背面素材；当前后视图为下述生成补绘，不把镜像正面称为背面，也不把图片放大称为原生高清。

v1.4.2 只在运行时用程序局部网格形变显示既有 PNG，不修改或重绘原文件、不下载新增位图。此动效不是原作者动作帧；素材来源、角色权利及原有许可边界不变。

## 弗糯糯新增素材

以下生成素材最初使用 1280×1280 画布，处理后当前 PNG 实际尺寸均为 1254×1254（2026-10-02 核查）；文中的画布尺寸不等同于最终文件尺寸。

- `assets/images/nuonuo_front.png`、`nuonuo_back.png`：内置 imagegen 生成的 1280×1280 透明重绘试用素材。正面参考 https://safebooru.org/index.php?id=6354064&page=post&s=view ，页面标注作者 Akaoni (zumt3548)。保留灰青发色、粉蓝半睁呆眼及红白衣服的识别特征。背面按合理结构补绘，已去掉误画的正面胸花与领口。完整生成要点见 docs/ART-NOTES.md。
- `assets/images/phoebe_wave.png`、`nuonuo_wave.png`：内置 imagegen 生成的 1280×1280 透明互动姿势试用素材，分别以前述菲比原图、弗糯糯参考重绘正面为视觉参考；包含眨眼、挥手和抬脚。不是原作者未修改素材，不把已有素材许可证延伸到这些图。
- `assets/images/phoebe_back.png`：内置 imagegen 生成的 1280×1280 透明菲比后视试用素材，参考原始戴帽正面图的帽子、发色与服装；仅出现帽沿、后发、后裙摆与鞋跟，不把正面镜像冒称背面。不是原作者未修改素材，不把已有素材许可证延伸到这张图。
- `assets/images/phoebe_sleep.png`、`phoebe_angry.png`、`nuonuo_drowsy.png`、`nuonuo_angry.png`：内置 imagegen 生成的 1280×1280 透明状态姿势试用素材。分别用于独立打盹、菲比敲屏、弗糯糯困倦和弗糯糯敲屏；参考前述角色图与公开桌宠动作的“抱膝、举拳、眨眼”动作语言。不是原作者未修改素材，不把已有素材许可证延伸到这些图。
- 这些图片不是原作者未修改素材，不能把上面的 CC BY-NC-SA 许可自动套用到它们。仅用于本个人非商业同人试用，不提供角色或参考作品的商业使用授权。
- “糯糯”候选音轨来自 B 站《就知道逗糯糯》 https://www.bilibili.com/video/BV1jJAFznEi9/ ，公开视频 CID 36856597821。用户随后确认已向作者取得本机下载使用许可；从本地音轨裁出三个短片段保存在 Git 忽略的 `local-media/nuonuo/`。不上传候选音轨、短片段或原视频，也不推定获得再分发授权。默认构建不带这些文件；显式 `npm run build:local` 只为本机复制三个白名单片段。缺失时回退为本机中文语音/合成提示音；实际字音与听感仍需用户试听。用户自定义导入也仅保存本机。
