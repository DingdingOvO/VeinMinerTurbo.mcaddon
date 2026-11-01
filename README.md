# VeinMinerTurbo

Minecraft Bedrock 连锁采集附加包。**只有一个行为包**：没有资源包、没有自定义物品、没有 JSON UI。

潜行 + 挖掘 → 整条矿脉 / 整棵树 / 指定立方体范围连锁破坏。

## 玩法

| 操作 | 结果 |
|---|---|
| 潜行 + 挖矿石、原木 | 整条连通的同类方块一起破坏 |
| 潜行 + 挖白名单里的普通方块 | 以该方块为中心，按设置里的长/高/宽挖一个长方体 |
| 不潜行 | 正常单块破坏，不触发 |

- 创造模式不触发
- 工具按 **每 4 块扣 1 点耐久**；设置里可开「耐久保护」，余量不足时截断并提示「只连锁了 X/Y 块」
- 掉落物走原版规则：精准采集、时运都会对每一块生效

## 命令

全部是 `vm:` 命名空间的自定义命令，注册时 `permissionLevel: Any` + `cheatsRequired: false`，**普通成员就能用，不需要 OP，也不需要开作弊**。

| 命令 | 简写 | 作用 |
|---|---|---|
| `/vm:wl add [方块]` | `/vm:wl a` | 加入个人白名单（不填 ID 就用瞄准的方块） |
| `/vm:wl remove [方块]` | `/vm:wl r` | 移除 |
| `/vm:wl list` | `/vm:wl l` | 查看 |
| `/vm:wl clear` | `/vm:wl c` | 清空 |
| `/vm:c toggle` | `/vm:c t` | 连锁开关 |
| `/vm:c outline` | `/vm:c o` | 粒子描边开关 |
| `/vm:c menu` | `/vm:c m` | 打开设置菜单 |
| `/vm:help [wl\|c\|ad]` | `/vm:h` | 命令说明 |

管理命令（仅 OP）：

| 命令 | 作用 |
|---|---|
| `/vm:ad bl add\|remove\|list` | **禁大范围**：默认不连锁，玩家加白名单后只能小范围挖 |
| `/vm:ad lk add\|remove\|list` / `bi` | **锁定**：任何白名单都连锁不了它；`bi` 看内置清单 |
| `/vm:ad pb add\|remove\|list` | **玩家黑名单**：这个人的连锁和所有命令全部失效 |

## 判定顺序

```
锁定（内置 + OP 加的）        → 跳过
管理员设的「禁大范围」         → 没加白名单就跳过，加了只挖长方体
矿石 / 原木                   → 整条连通
玩家白名单里的普通方块         → 长方体范围
其它                          → 跳过
```

## 项目结构

```
src/
├── main.ts                 # 只负责启动：注册事件、命令、描边循环
├── commands/
│   ├── index.ts            # 路由 + 玩家黑名单拦截
│   ├── registry.ts         # 自定义命令注册 + restricted-execution 队列
│   ├── whitelist.ts        # /vm:wl
│   ├── settings.ts         # /vm:c
│   ├── admin.ts            # /vm:ad
│   ├── help.ts             # /vm:help
│   └── shared.ts           # 回显、OP 判断、方块 ID 解析
├── core/
│   ├── VeinMiner.ts        # 破坏事件 → 判定 → 扫描 → 提交队列
│   ├── Scanner.ts          # BFS 连通扫描
│   ├── Excavate.ts         # 长方体扫描
│   ├── TreeDetector.ts     # 树叶扫描
│   ├── BreakExecutor.ts    # 分 tick 破坏 + 耐久结算 + 掉落收集
│   └── Outline.ts          # 粒子描边（内部面 / 背面 / 遮挡三层剔除）
├── config/
│   ├── Constants.ts        # 默认值
│   ├── PlayerConfig.ts     # 玩家偏好（DynamicProperty）
│   ├── blocks/             # 矿石、原木、树叶、内置锁定表
│   └── admin/              # 服务器级：禁大范围 / 锁定 / 玩家黑名单
├── data/
│   ├── Whitelist.ts        # 个人白名单存储
│   └── BlockNames.ts       # 方块中文名表
├── ui/VeinMinerUI.ts       # 设置表单
└── utils/                  # 三语文本、附魔掉落、工具
```

## 构建

```bash
npm install
node build.mjs          # 编译 + 打包到 upload/
node build.mjs --watch  # 只编译，改完自动重建
npm run typecheck       # 类型检查
```

产物：`upload/VeinMinerTurbo-vX.Y.Z.mcaddon`（内含单个 `.mcpack`）。

## 语言

脚本内嵌简体中文 / 繁體中文 / English 三套文本，按 `player.clientSystemInfo.locale` 选择，不依赖资源包，聊天框不会出现原始翻译键。
