# workFeiBi

一个透明、置顶、可拖动的“菲比啾比”学习监督桌宠。

## 启动

双击 `启动workFeiBi.vbs`，或直接打开 `release/workFeiBi/workFeiBi.exe`。已打包版本不需要联网，也不需要另装 Node.js。请保留整个 `release/workFeiBi` 文件夹，不能单独移动 EXE。

`启动菲比学习小助手.bat` 也可启动；若独立程序不存在，会使用 Node.js 开发模式。

也可以在终端运行：

```powershell
npm install
node node_modules/electron/install.js
npm start
```

## 操作

- 拖动菲比：移动桌宠。
- 单击菲比：互动；提醒出现时用于确认。
- 双击菲比：打开计时设置。
- 右键菲比：开始/暂停、跳过、重置、隐藏或退出。
- 学习或休息倒计时结束后会出现提示；默认 60 秒未确认会进入生气状态并播放“菲比啾比”语音。

设置窗口可修改学习时长、休息时长、生气等待时间、桌宠大小、语音和自动待机动作。

系统托盘可恢复隐藏的桌宠；Ctrl+Shift+F 切换显隐。设置与拖动位置自动保存。修改时长在下一轮生效，保存后重置可立即应用。本次轮数与计时在退出后重置。

当前形象使用原始 500×500 透明表情 PNG，保留原来的眼型，可切换戴帽、摘帽和节日外观。现有动作为呼吸、轻摆、小跳、提起与休息符号，生气为抖动加提示和语音。真正的多姿势/背面高清素材仍待补齐。

运行 `npm test` 检查计时状态；`npm run smoke` 运行窗口/音频解码/提醒与确认验证，截图输出至 qa；`npm run build` 生成 release 下的独立 EXE 目录。独立版需要保留整个文件夹，无需 Node.js。

## 素材与许可

Q 版图片与语音来自 [Genius-Society/phoebe_chubby](https://github.com/Genius-Society/phoebe_chubby)，按 CC BY-NC-SA 4.0 用于本非商业项目。完整许可见 `ASSET-LICENSE.txt`。角色相关权利归《鸣潮》及其权利人所有。

详细素材来源见 ASSET-SOURCES.md。
