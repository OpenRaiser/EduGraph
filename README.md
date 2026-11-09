<a id="top"></a>

<div align="center">

<a href="https://openraiser.github.io/EduGraph/">
  <img src="docs/assets/edugraph-banner.svg" alt="EduGraph — Connected knowledge for education agents" width="1100" />
</a>

# EduGraph

**Connected Knowledge for Education Agents**

面向教育 Agent 的开放知识图谱与数据基础设施。<br>
让课程标准、知识点、先修关系、教材、讲解与习题，在同一张图中相连。

<p>
  <a href="https://openraiser.github.io/EduGraph/"><img src="https://img.shields.io/badge/EXPLORE-LIVE-2563a8?style=for-the-badge&amp;logo=githubpages&amp;logoColor=white" alt="Explore EduGraph online"></a>
  <img src="https://img.shields.io/badge/CONCEPTS-5%2C269-2aa7c7?style=for-the-badge" alt="5269 Concepts">
  <img src="https://img.shields.io/badge/SUBJECTS-10-f18b42?style=for-the-badge" alt="10 Subjects">
  <a href="LICENSE-DATA"><img src="https://img.shields.io/badge/DATA-CC_BY--SA_4.0-17365c?style=for-the-badge" alt="Data license CC BY-SA 4.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/CODE-Apache_2.0-607f9e?style=for-the-badge" alt="Code license Apache 2.0"></a>
</p>

<p>
  <a href="https://openraiser.github.io/EduGraph/"><b>🌐 在线探索</b></a> ·
  <a href="https://openraiser.github.io/EduGraph/downloads/edugraph-v0.21.0.tar.gz"><b>📦 下载数据</b></a> ·
  <a href="#features"><b>✨ 核心能力</b></a> ·
  <a href="#data"><b>📊 数据概览</b></a> ·
  <a href="#quickstart"><b>🚀 本地运行</b></a>
</p>

</div>

---

## 🌐 从一个知识点开始

在 [EduGraph Explorer](https://openraiser.github.io/EduGraph/) 中搜索知识点，点击节点即可查看前置知识、后继知识、讲解、例题、课标与教材编排。无需登录，无需安装。

<p align="center">
  <a href="https://openraiser.github.io/EduGraph/"><img src="docs/assets/explorer-preview.png" alt="EduGraph Explorer: search results, concept network, and textbook covers" width="1100" /></a>
  <br><sub>左侧检索 · 中间探索知识关系与教材编排 · 右侧查看关联教学资源</sub>
</p>

| 从哪里开始？ | 可以看到什么？ |
|:---|:---|
| [**分数** →](https://openraiser.github.io/EduGraph/#/concept/mathematics.primary.number-and-algebra.number-and-operations.decimals-and-fractions.fractions) | 从知识关系出发，查看例题与不同出版社的教材位置。 |
| [**小数与分数的互化** →](https://openraiser.github.io/EduGraph/#/concept/mathematics.primary.number-and-algebra.number-and-operations.decimals-and-fractions.decimal-fraction-conversion) | 查看先修依赖，并根据已掌握的知识生成学习顺序。 |
| [**关于数据集** →](https://openraiser.github.io/EduGraph/#/about) | 浏览知识全景、跨学段关系与数据说明，下载完整公开包。 |

<a id="features"></a>

## ✨ 一张图，连接六类信息

| | 能力 | 在浏览器里做什么 |
|:---:|:---|:---|
| 🔎 | **知识检索** | 中文搜索、学科与学段筛选、Topic 层级导航。 |
| 🕸️ | **关系探索** | 展开 1–3 跳前置/后继关系，点击、拖动和缩放局部知识图。 |
| 🧭 | **学习路径** | 选择目标，结合已掌握集合，生成满足先修约束的可行顺序。 |
| 📚 | **教材视图** | 对照不同出版社的册次与章节顺位，查看匹配的教材参考封面。 |
| ✏️ | **讲解与习题** | 查看 KeyPoints、例题、答案解析及关联课标。 |
| 📦 | **开放数据** | 分享知识点链接、导出单点 JSON、下载完整 JSONL 数据与校验文件。 |

<p align="center">
  <a href="https://openraiser.github.io/EduGraph/#/about"><img src="web/assets/figure-2.png" alt="Curriculum standards, shared concept network and textbook views" width="1100" /></a>
  <br><sub>课标连接共享知识网络；不同教材保留各自的组织视图。</sub>
</p>

<a id="data"></a>

## 📊 数据概览

覆盖 **10 个学科、3 个学段**，连接知识结构与教学资源。以下为公开数据包的精确计数。

| 知识与关系 | 数量 | 教学资源 | 数量 |
|:---|---:|:---|---:|
| Concept · 知识点 | **5,269** | KeyPoint · 讲解要点 | **11,765** |
| Topic · 主题 | **1,322** | Exercise · 习题 | **7,107** |
| PREREQUISITE · 先修关系 | **4,882** | StandardItem · 课标条目 | **2,844** |
| REFINES · 分类层级 | **6,417** | Textbook · 教材册次 | **752** |
| COVERS · 课标关联 | **7,694** | Chapter · 教材章节 | **6,878** |
| TEACHES · 教材关联 | **21,971** | Subject / Stage · 学科 / 学段 | **10 / 3** |

<p align="center">
  <img src="web/assets/figure-3.png" alt="Concept landscape, a cross-stage prerequisite chain, coverage and precision by layer" width="1100" />
</p>

📥 **[下载完整数据包](https://openraiser.github.io/EduGraph/downloads/edugraph-v0.21.0.tar.gz)** · [SHA-256 校验](https://openraiser.github.io/EduGraph/downloads/edugraph-v0.21.0.tar.gz.sha256) · [Data Card](DATA_CARD.md)

<a id="quickstart"></a>

## 🚀 本地运行

需要 **Node.js ≥ 20.11** 和 `tar`。网页与构建工具无需安装 npm 依赖。

```bash
git clone https://github.com/OpenRaiser/EduGraph.git
cd EduGraph
npm run build
npm test
npm run dev
```

打开 **http://127.0.0.1:4173/EduGraph/**。首次构建会校验并解压公开数据包，生成检索索引和 24 个按学科、学段划分的资源文件。

## 🗂️ 数据如何组织

```text
data/
  edugraph-v0.21.0.tar.gz      完整公开数据及数据说明
  edugraph-v0.21.0.tar.gz.sha256
  open/v0.21.0/              构建时解压，Git 忽略
    knowledge-points/       Concept、Topic、REFINES、PREREQUISITE
    keypoints/              讲解要点
    exercises/              习题、答案与解析
    standards/              课标条目
    standards-alignment/    COVERS 关联
    textbook-alignment/     教材、章节与 TEACHES 关联
web/                        图谱浏览器、查询模块与展示素材
scripts/                    构建、预览、发布与线上验证
tests/                      真实数据与关联完整性测试
docs/assets/                README 展示素材
```

| 关系 | 方向 | 含义 |
|:---|:---|:---|
| `REFINES` | 子节点 → 父主题 | 组织知识的分类层级。 |
| `PREREQUISITE` | 前置 Concept → 后继 Concept | 表达知识依赖。 |
| `COVERS` | 课标条目 → Concept | 将课程要求绑定到共享知识。 |
| `TEACHES` | 教材章节 → Concept | 保留主讲、复习、提及等教学角色。 |

<details>
<summary><b>📖 语义与使用说明</b></summary>

- 教材编排顺序与先修关系分别保存；教材轨道的箭头不转换成先修边。
- 教材目录视图保留章节顺位与关联知识点，公开包未包含原书章节标题和印刷编号。
- 学习路径是先修约束下的一条可行顺序；已掌握标记仅保存在当前浏览器。
- 数据保留原始来源与审核状态。资源存在和关联正确性是不同指标，机器审核不表示人工核验。
- 教材参考封面按出版社、学科、系列与册次匹配，具体印次未逐一核验；点击封面可追溯来源。未匹配时使用文字封面。
- 完整公开数据包不含真实学生历史记录，浏览器也不向服务器上传学习标记。

</details>

## ⚙️ 发布与复现

| 分支 | 内容 |
|:---|:---|
| [`main`](https://github.com/OpenRaiser/EduGraph/tree/main) | 网页源码、公开数据、说明与构建脚本。 |
| [`gh-pages`](https://github.com/OpenRaiser/EduGraph/tree/gh-pages) | 自动生成的网站，可直接由 GitHub Pages 托管。 |

向 `main` 推送后，[GitHub Actions](https://github.com/OpenRaiser/EduGraph/actions/workflows/pages.yml) 自动构建、运行数据测试、检查发布文件范围并部署。随后访问线上资源，验证全部数据分片、检索与下载校验和。

```bash
npm run audit:site  # 检查可发布文件、来源记录和完整数据包
```

## 🤝 许可与致谢

- **代码**：[Apache 2.0](LICENSE)
- **公开教育数据**：[CC BY-SA 4.0](LICENSE-DATA)，详细说明见 [Data Card](DATA_CARD.md)。
- **教材封面**：来自 [TapXWorld/ChinaTextbook](https://github.com/TapXWorld/ChinaTextbook)，保留每张图片的来源与匹配信息。封面版权归相应出版社及权利人，不随教育数据重新授予 CC BY-SA 许可，见 [封面来源说明](web/assets/covers/NOTICE.txt)。
- 项目展示风格参考 [PAGER](https://github.com/OpenRaiser/Pager) 与 [PaperFit](https://github.com/OpenRaiser/PaperFit)。

<div align="center">

**[进入 EduGraph →](https://openraiser.github.io/EduGraph/)** · [返回顶部 ↑](#top)

</div>
