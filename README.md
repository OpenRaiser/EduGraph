# EduGraph Explorer

EduGraph 的静态知识图谱浏览器。包含完整公开数据及可部署到 GitHub Pages 的网页。

在线浏览：**https://openraiser.github.io/EduGraph/**

## 本地运行

需要 Node.js >= 20.11，以及 `tar`（Windows 10/11、Linux 和 macOS 通常已包含）。无需安装 npm 依赖。

```sh
npm run build
npm test
npm run dev
```

打开 <http://127.0.0.1:4173/EduGraph/>。不能直接双击 HTML：浏览器需要通过 HTTP 加载数据。

## 功能

- 全部 5,269 个 Concept、1,322 个 Topic 的中文检索、学科/学段筛选和层级导航。
- 一至三跳前置/后继关系，Topic 从属关系，节点点击、拖动、缩放。
- KeyPoints、例题与答案解析、课程标准及教材映射。
- 多出版社目录骨架视图，按本册章节顺位展示所有关联 Concept。
- 根据目标及已掌握集合生成先修学习顺序；标记只保存在浏览器本地。
- 知识点永久链接、单点 JSON 导出、完整公开数据 tar.gz 下载及 SHA-256 校验。
- 数据集介绍页使用用户确认的 Figure 2 与新版 Figure 3。

## 两个分支

公开仓库为 **OpenRaiser/EduGraph**，网站地址为 **https://openraiser.github.io/EduGraph/**。

- `main`：此目录的源码、公开数据、说明文档和构建脚本。
- `gh-pages`：Actions 自动生成的 `dist/` 内容。无需手工修改。

首次发布：

1. 将本目录作为 `OpenRaiser/EduGraph` 的仓库根目录加入 `main`。
2. GitHub 仓库的 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 确保工作流具备 Contents 写权限（用于更新 `gh-pages`），以及 Pages 和 ID token 写权限。
4. 在 Actions 中运行 **Publish EduGraph**，或向 `main` 推送一次更新。
5. 地址为 `https://openraiser.github.io/EduGraph/`。公开仓库支持免费的 GitHub Pages。

工作流先构建与验证，再以普通 fast-forward push 更新 `gh-pages`，并通过官方 Pages Actions 发布同一份构建产物。这样不依赖 `GITHUB_TOKEN` 推送分支再次触发 Pages 构建。源码中所有资源使用相对路径，知识点链接采用 hash 路由，支持 `/EduGraph/` 等项目子目录。

## 数据与语义

数据基准为 `data/open/v0.21.0/`，来自完整交接包 2026-11-07。数据保持原始字段；浏览网页使用构建时生成的紧凑索引与 24 个学科/学段资源分片。Git 仓库保存压缩的 `data/edugraph-v0.21.0.tar.gz` 与 SHA-256 文件，首次构建会校验并解压到被 Git 忽略的 `data/open/`，减少仓库体积。

- `REFINES`：子节点属于父主题，表示分类层级。
- `PREREQUISITE`：前置 → 后继，表示依赖方向。
- `COVERS`：课标条目 → Concept。
- `TEACHES`：教材章节 → Concept；保留主讲、复习、提及角色。
- 教材轨道中的箭头只表示教材编排顺序，不转换成先修边。
- 公开包无教材章节原始标题及印刷编号。界面显示“单元/章节顺位”并列出关联知识点。
- Topic 不能直接作为学习目标；点击下属 Concept 后生成学习路径。
- 学习路径是图上的可行依赖顺序，不是对学习效果的保证。已掌握节点沿用核心算法的前提：其前置知识同时视为满足。
- 每份讲解、题目与映射保留原始审核状态，机器审核不表示已完成人工核验。

## 目录

```text
data/*.tar.gz       完整公开数据压缩包及 SHA-256 校验文件
data/open/v0.21.0/  首次构建时解压，Git 忽略
web/               网页、核心查询模块与论文图片
scripts/           构建、本地预览、分支发布
tests/             真实数据的检索、图关系、学习路径与资源完整性测试
.github/workflows/  main → 构建 → gh-pages → Pages
dist/              生成文件；不提交到 main
```

`web/core/` 中的图遍历、BM25 与分词模块直接复用原项目；`model.mjs` 处理浏览器视图，`network.mjs` 提供有界局部图布局，`app.mjs` 连接交互与按需加载。

代码许可：Apache 2.0。公开数据许可：CC BY-SA 4.0。均随下载与页面提供。论文图为项目方提供的展示素材。

发布前运行 `npm run audit:site`。检查仅允许已确认的网页运行文件、两张展示图和公开数据；任何额外论文源文件、PDF、凭证文件或符号链接都会阻止发布。
