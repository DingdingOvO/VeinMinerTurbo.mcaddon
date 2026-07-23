# VeinMiner 资源包设计文档

## 1. 目标

在 HUD 顶部，紧挨屏幕顶部的 4 个按钮（暂停/聊天/表情/权限），添加一个 ToggleControl 开关和一个设置齿轮按钮。

效果：
```
[← 聊天 | 表情 | 权限 | 暂停]  [连锁采集 ○━━━ ●]  [⚙]
```

- **ToggleControl**：和游戏设置里一样的滑动开关，一眼看出开/关状态
- **设置按钮**：原版齿轮图标，点击弹出设置表单

使用游戏内置 UI 组件和纹理，不做自定义美术资源。

---

## 2. 技术方案

### 原理

```
玩家点击 HUD 按钮
  → 资源包 JSON UI 触发 /scriptevent vm:t 或 vm:s
    → 行为包 scriptEventReceive 监听器处理
      → 切换开关 / 弹出设置表单
```

### 为什么用 scriptEvent

- 不依赖 Beta API（chatSend 是 Beta）
- 客户端和 BDS 都支持
- 行为包已有 scriptEvent 监听逻辑，直接复用

---

## 3. 资源包文件结构

参照 Mojang 官方 [bedrock-samples](https://github.com/Mojang/bedrock-samples/tree/main/resource_pack) 规范：

```
VeinMiner-RP/
├── manifest.json
├── _ui_defs.json
├── ui/
│   └── vm_hud.json
└── texts/
    ├── languages.json        # 语言列表
    ├── language_names.json   # 语言显示名
    ├── en_US.lang            # 英文
    └── zh_CN.lang            # 中文
```

### 多语言规范

参照 Mojang bedrock-samples 的 `texts/` 目录结构：

- **`languages.json`**：列出支持的语言代码数组
- **`language_names.json`**：语言代码 → 显示名的映射
- **`{locale}.lang`**：每个语言一个 `.lang` 文件，格式为 `key=value` 键值对
- 主要做 `en_US.lang` + `zh_CN.lang`，其余语言用 `en_US.lang` 兜底

---

## 4. 各文件详细设计

### 4.1 manifest.json

```json
{
  "format_version": 2,
  "header": {
    "name": "VeinMiner UI",
    "description": "VeinMiner HUD buttons",
    "uuid": "<TBD: 新生成>",
    "version": [0, 0, 1],
    "min_engine_version": [1, 21, 0]
  },
  "modules": [
    {
      "type": "resources",
      "uuid": "<TBD: 新生成>",
      "version": [0, 0, 1]
    }
  ],
  "dependencies": [
    {
      "uuid": "38fac878-f8ee-4f28-a010-620ba2a7c662",
      "version": [0, 0, 1]
    }
  ]
}
```

依赖行为包 UUID，确保一起加载。

### 4.2 _ui_defs.json

```json
["ui/vm_hud.json"]
```

### 4.3 ui/vm_hud.json（核心）

通过 `modification` 修改 `hud_screen`，在顶部按钮栏旁边插入自定义面板。

#### 布局结构

```
hud_screen (modification)
  └─ root_panel (modification)
      └─ @veinminer_hud_panel (新增，插入到顶部按钮栏旁边)
          └─ vm_container (StackPanel, 水平排列)
              ├─ vm_toggle_panel
              │   ├─ vm_toggle_label ("连锁采集")
              │   └─ vm_toggle (ToggleControl)
              └─ vm_settings_button (Button, 齿轮图标)
```

#### 按钮位置策略

屏幕顶部 4 个按钮（聊天/表情/权限/暂停）由原版 `hud_top_bar` 面板控制。资源包通过 `modification` 在同一区域添加元素，与原版按钮视觉上排列在一行。

定位方式：
- 锚点：顶部居中偏左（原版按钮栏右侧）
- 具体偏移量需实测微调

#### ToggleControl

使用原版 `ToggleControl` 组件（和游戏设置页一样的滑动开关）：

```json
"vm_toggle": {
  "type": "toggle",
  "toggle_name": "vm_toggle",
  "default_toggle_state": false,
  "toggle_group": "veinminer"
}
```

#### 状态同步方案

**问题：** ToggleControl 是纯客户端组件，点击只能改变 UI 状态，无法直接传递给服务端。需要通过 `button_press_actions` 或 `button_mappings` 触发 `/scriptevent vm:t`。

**实现方式：**
1. ToggleControl 点击 → 触发 `button_press_actions` → `run_command: /scriptevent vm:t`
2. 行为包切换 DynamicProperties 中的开关状态
3. 行为包通过 ActionBar 提示当前状态（已有逻辑）

**ToggleControl 的视觉状态同步**需要 UI 变量 + 客户端事件，复杂度较高。**一期不做状态同步**，ToggleControl 仅作为触发按钮，视觉状态仅供参考。ActionBar 已经有明确的开/关提示。

#### 设置按钮

```json
"vm_settings_button": {
  "type": "button",
  "size": ["default", 30],
  "image": "textures/ui/settings_glyph",
  "button_press_actions": [
    {
      "name": "run_command",
      "command": "/scriptevent vm:s"
    }
  ]
}
```

使用原版 `textures/ui/settings_glyph` 齿轮图标。

### 4.4 texts/ 多语言文件

#### languages.json
```json
["en_US", "zh_CN"]
```

#### language_names.json
```json
{
  "en_US": "English",
  "zh_CN": "简体中文"
}
```

#### en_US.lang
```
vm.name=VeinMiner
vm.toggle=Vein Miner
vm.settings=Settings
```

#### zh_CN.lang
```
vm.name=连锁采集
vm.toggle=连锁采集
vm.settings=设置
```

---

## 5. 行为包配合

### 现有逻辑——零改动

| scriptEvent | 现有处理 | 改动？ |
|-------------|---------|--------|
| `vm:t` | 切换开关 + ActionBar 提示 | ❌ 不用改 |
| `vm:s` | 调用 `showSettings()` 弹出表单 | ❌ 不用改 |
| `vm:a` | 添加注视方块到白名单 | ❌ 不用改 |

### ChatHandler 降级处理

`#vm` 聊天命令在 BDS 上不可用（Beta API），但 HUD 按钮通过 scriptEvent 触发，**完美绕过此限制**。ChatHandler 的 graceful fallback（提示用 `/scriptevent`）保持不变。

---

## 6. 打包方式

### 输出产物

| 文件 | 内容 | 用途 |
|------|------|------|
| `VeinMiner-v0.0.1.mcpack` | 仅行为包 | 纯命令行用户 |
| `VeinMiner-RP-v0.0.1.mcpack` | 仅资源包 | 开发调试用 |
| `VeinMiner-v0.0.1.mcaddon` | 行为包 + 资源包 | **主发布包，一键安装** |

### .mcaddon 格式

`.mcaddon` 就是包含多个 `.mcpack` 的 zip 文件，扩展名改為 `.mcaddon`。Minecraft 安装时会自动解压并导入所有包。

```
VeinMiner-v0.0.1.mcaddon (zip)
  ├── VeinMiner-v0.0.1.mcpack (zip = behavior_pack/)
  └── VeinMiner-RP-v0.0.1.mcpack (zip = resource_pack/)
```

### build.mjs 改动

在现有构建流程后追加：
1. 将 `resource_pack/` 打包为 `VeinMiner-RP-v0.0.1.mcpack`
2. 将两个 `.mcpack` 合并为 `VeinMiner-v0.0.1.mcaddon`

---

## 7. 兼容性

| 环境 | HUD 按钮 | scriptEvent | 设置表单 |
|------|---------|-------------|----------|
| 单人/局域网 | ✅ | ✅ | ✅ |
| BDS | ✅ | ✅ | ✅ |
| 不装资源包 | ❌ | ✅ 手动输入 | ✅ |

资源包**可选**。不装也能用，只是没有 HUD 按钮。

---

## 8. 开发步骤

1. 生成 2 个新 UUID（资源包 header + module）
2. 创建 `resource_pack/` 目录结构
3. 编写 `ui/vm_hud.json`（JSON UI 定义）
4. 编写 `texts/` 多语言文件
5. 本地单人世界测试：加载行为包 + 资源包，验证按钮显示和点击
6. 微调按钮位置/大小
7. 修改 `build.mjs` 增加资源包打包 + .mcaddon 合并
8. BDS 测试
