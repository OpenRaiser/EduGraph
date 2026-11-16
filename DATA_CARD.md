# EduGraph public data — v0.28.0 public preview

The download contains the EduGraph main graph (`v0.28.0/`), independent ChinaTextbook source catalog views (`source-views-v0.28.0/`), this data card, and the data license. This is a **public preview**. Curriculum-derived Concepts, prerequisite candidates, automatically matched curriculum links, and machine-reviewed learning resources retain their respective provenance and review status. Public availability and machine review do not certify independent teacher assessment.

Source views link to existing textbook records; they are not additional, disjoint textbooks to add to the main graph totals.

## Main graph

| Resource | Count |
|---|---:|
| Concepts | 8,892 |
| Topics | 1,676 |
| REFINES | 10,257 |
| PREREQUISITE | 6,443 |
| KeyPoints | 19,445 |
| Exercises | 10,730 |
| StandardItems | 5,445 |
| Curriculum themes / subthemes | 255 / 681 |
| COVERS | 13,427 |
| Textbook volumes | 1,161 |
| Textbook chapters | 12,607 |
| TEACHES | 23,411 |
| Subjects | 18 |
| Learning stages | 3 |
| Subject/stage partitions | 41 |

The StandardItem count includes only records with `type: "StandardItem"`. The manifest's `counts.standard_items` counts all 6,381 curriculum nodes, including the 255 ContentThemes and 681 ContentSubThemes shown separately above.

The graph covers mathematics, Chinese, English, physics, chemistry, biology, history, geography, politics, science, information technology, music, fine arts, integrated arts, Japanese, Russian, physical education and health, and general technology. Japanese and Russian cover **junior and senior secondary education**. Physical education and health, music, and fine arts include primary, junior-secondary, and senior-secondary partitions; integrated arts includes junior and senior secondary. General technology covers senior secondary education. These totals do not imply that every subject spans all three stages.

## Additions in v0.28.0: curriculum-driven expansion

This release processes **1,580 additional curriculum requirements** through the original construction workflow and adds **1,703 Concepts, 166 Topics, 3,686 KeyPoints, 1,703 exercises, 510 PREREQUISITE edges, 3,125 COVERS edges, and 1,834 REFINES edges** relative to v0.27.0. Curriculum organization adds 151 ContentThemes and 561 ContentSubThemes.

| Expansion scope | New Concepts | New KeyPoints | New exercises |
|---|---:|---:|---:|
| Junior-secondary Japanese | 108 | 222 | 108 |
| Primary and junior-secondary physical education and health | 265 | 547 | 265 |
| Senior Chinese, English, history, biology, chemistry, physics, mathematics, geography, and politics | 1,330 | 2,917 | 1,330 |
| Total | **1,703** | **3,686** | **1,703** |

The workflow includes candidate generation, duplicate and scope review, identifier assignment, explanation and exercise generation, model review and repair, prerequisite review, and release validation. Every added Concept has curriculum references, a definition explanation, and one exercise. The new learning resources are `machine_reviewed`, with generation and review provenance retained. Both model-review rounds use `gpt-6.1-sol`; independent agent checks supplement the recorded model findings. Explanations and exercises are generated resources, not textbook extracts or independent teacher judgments.

The existing 7,189 Concepts, their identifiers, prior resource records, and all 5,933 historical prerequisite edges are retained. Four new-node aliases were removed to resolve exact-search ambiguity. Public prompt-version labels are shortened to the existing field limit; prompt hashes and complete private provenance are preserved. Curriculum coverage counters are recomputed from the expanded StandardItem set.

Of the 1,580 added StandardItems, **1,505 have COVERS links**; all 1,580 remain in the public curriculum table. Textbook volumes, chapter records, TEACHES links, and independent source views are carried forward from v0.27.0. Concept expansion does not create unverified textbook mappings.

## Historical expansion in v0.27.0: junior-secondary Russian

The v0.27.0 release added **127 Concepts, 12 Topics, and 101 StandardItems** from the 2022 compulsory-education Russian curriculum standard, together with **269 KeyPoints, 127 exercises, 62 PREREQUISITE edges, 187 COVERS edges, and 135 REFINES edges**. Curriculum organization added four ContentThemes and eight ContentSubThemes.

| Russian scope | Concepts | KeyPoints | Exercises |
|---|---:|---:|---:|
| Junior secondary, added in v0.27.0 | 127 | 269 | 127 |
| Senior secondary, retained unchanged | 108 | 230 | 108 |
| Russian total | **235** | **499** | **235** |

All 127 added Concepts have explanations and exercises. The retained new learning resources are `machine_reviewed`; source-backed agent adjudications supplement the original model review. These are machine review records, not independent teacher assessments. New Concepts remain `draft`, new prerequisites remain `candidate`, and COVERS links remain `auto_matched`.

Of the 101 added StandardItems, **93 have COVERS links and eight remain uncovered**. Complete resource presence for the new Concepts does not imply complete coverage of the curriculum requirements. The uncovered requirements remain in the public data and in the coverage denominator.

That release retained the existing 7,062 Concepts and their prior resources and relationships unchanged. Textbook volumes, chapters, TEACHES links, and independent source views were also unchanged from v0.26.0. New junior-secondary Russian Concepts did not automatically receive textbook mappings.

## Previous expansion in v0.26.0

Compared with v0.25.0, v0.26.0 added **1,313 Concepts and 134 Topics** while retaining the identifiers and full node contents of the existing 5,749 Concepts. It also filled both explanation and exercise gaps for **311 existing Concepts** from the preceding arts-related expansion. Resource generation covered 1,624 Concepts; resource review covered 1,793 Concepts, including 169 existing information-technology Concepts whose resources were already present. The following table records that expansion and its totals at v0.26.0.

| Subject expanded | New Concepts | v0.26.0 Concepts | v0.26.0 KeyPoints | v0.26.0 exercises |
|---|---:|---:|---:|---:|
| General technology | 380 | 380 | 807 | 380 |
| Fine arts | 233 | 390 | 791 | 390 |
| Physical education and health | 218 | 218 | 474 | 218 |
| Japanese | 140 | 140 | 295 | 140 |
| Russian | 108 | 108 | 230 | 108 |
| Music | 100 | 192 | 388 | 192 |
| Integrated arts | 86 | 148 | 302 | 148 |
| Chinese, including calligraphy | 32 | 466 | 1,006 | 602 |
| Information technology | 16 | 185 | 373 | 185 |

That release added a net **3,387 KeyPoints**, **1,624 exercises**, **691 StandardItems**, and **1,839 COVERS edges**. The 691 additional StandardItems represent **662 distinct source requirements plus 29 stage projections**; a requirement projected to more than one learning stage is not counted as multiple independent source passages. Curriculum organization added 58 ContentThemes and 112 ContentSubThemes.

The expansion ran the original dataset-construction pipeline through actual model-API generation: curriculum requirements were decomposed into candidate Concepts, checked for duplication and scope, assigned stable identifiers, and connected to generated explanations, exercises, and prerequisite proposals. Explanations and exercises are **model-generated educational resources, not textbook extracts**. Earlier records keep their original provenance; they are not retroactively attributed to a later run.

All visible learning resources in the v0.26.0 expansion/review scope completed machine review. Eight newly generated KeyPoints were excluded following recorded review findings. The prerequisite graph was checked for cycles and invalid references, and transitive reduction preserved the reachability of historical prerequisites. A removed redundant direct edge can therefore remain represented by a multi-step path.

That expansion retained textbook volumes, chapters, TEACHES links, and independent source views from v0.25.0. In particular, new Concepts did not automatically receive textbook mappings. The current release does **not** claim complete coverage of all ChinaTextbook materials.

## Curriculum sources used by these expansions

The v0.28.0 additions use the **2022 compulsory-education Japanese and physical education and health curriculum standards**, and **2017 senior-secondary curriculum standards revised in 2020** for Chinese, English, history, biology, chemistry, physics, mathematics, geography, and politics. Earlier expansions used the additional documents listed below. Senior-secondary standards are available through the People's Education Press [official curriculum-standard collection](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/). Compulsory-education arts content uses the 2022 standard; Chinese calligraphy additions use the 2013 guideline. Source editions are recorded explicitly.

| Scope | Official source document |
|---|---|
| Junior Japanese | [义务教育日语课程标准（2022年版）](https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582351505877.pdf) |
| Primary and junior physical education and health | [义务教育体育与健康课程标准（2022年版）](https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582362336303.pdf) |
| Senior Chinese | [普通高中语文课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517522412911080.pdf) |
| Senior English | [普通高中英语课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517522153664167.pdf) |
| Senior history | [普通高中历史课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517518171679768.pdf) |
| Senior biology | [普通高中生物学课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519140545267.pdf) |
| Senior chemistry | [普通高中化学课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517517668288401.pdf) |
| Senior physics | [普通高中物理课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517520664858048.pdf) |
| Senior mathematics | [普通高中数学课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519489596282.pdf) |
| Senior geography | [普通高中地理课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517516728907929.pdf) |
| Senior politics | [普通高中思想政治课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519869509154.pdf) |
| Senior information technology | [普通高中信息技术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521187437000.pdf) |
| Senior music | [普通高中音乐课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521792634168.pdf) |
| Senior fine arts | [普通高中美术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517518487651706.pdf) |
| Senior integrated arts | [普通高中艺术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521458591016.pdf) |
| Senior general technology | [普通高中通用技术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517520410285510.pdf) |
| Senior physical education and health | [普通高中体育与健康课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517520130143580.pdf) |
| Senior Japanese | [普通高中日语课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517518796185803.pdf) |
| Senior Russian | [普通高中俄语课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517517065940620.pdf) |
| Junior Russian | [义务教育俄语课程标准（2022年版）](https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582353002089.pdf) |
| Compulsory-education music, fine arts, and integrated arts | [义务教育艺术课程标准（2022年版）](https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582364678888.pdf) |
| Chinese calligraphy | [中小学书法教育指导纲要（2013）](https://hudong.moe.gov.cn/srcsite/A26/s8001/201301/t20130125_147389.html) |

The public StandardItem records retain selected requirement text, source family, stage information, and Concept associations. Source documents are identified by the official links above. The Japanese and physical-education preparation used recorded institutional reprints of those documents; their download origin is not relabeled as an official-host download. Original PDFs, OCR transcripts, generation/review archives, and page-level working evidence are not included in the public package. A curriculum link does not establish that every mapped textbook uses the same curriculum or publication edition.

## ChinaTextbook source views

Source snapshot: [TapXWorld/ChinaTextbook at e2b3f62213c77bb8c33c5be355f97625ea1b8b61](https://github.com/TapXWorld/ChinaTextbook/tree/e2b3f62213c77bb8c33c5be355f97625ea1b8b61), checked on 2026-11-11.

The earlier v0.24.0 intake matched 980 main-textbook sources within the original ten subjects. Matching used subject, school system, textbook series/editor, grade, and volume; it did not certify identical publication editions. Of these sources, 957 matched a single main-graph record and 23 retained multiple same-series edition candidates. Seventy-two activity manuals or supplementary readers were outside that intake. These are historical ten-subject intake statistics, not evidence of exhaustive coverage across the current eighteen subjects.

That intake added 361 textbook records, 4,048 chapter nodes, and 1,044 TEACHES edges relative to v0.21.0. The subsequent information-technology expansion added 48 textbook records, 1,681 chapter nodes, and 396 TEACHES edges. These records are retained unchanged in v0.28.0.

The other 619 matched sources remain independently organized catalog views associated with existing books:

| Independent source-view resource | Count |
|---|---:|
| Source views | 619 |
| Sources with recovered catalog candidates | 391 |
| Sources without supported catalog structure yet | 228 |
| Chapter nodes | 4,451 |
| Candidate TEACHES edges | 359 |

These views, chapters, and mappings originate from v0.24.0 and are **carried forward without new source-view content** in this release. The distribution directory is `source-views-v0.28.0/`; its index records v0.27.0 as the immediate `carried_from` release.

These counts overlap with the main graph's textbook coverage and must not be added to its textbook totals. Each source preserves its own chapter order. Alternative catalogs are not interleaved into a single order, and textbook order is not converted into prerequisite edges.

## Read the data

Each nonempty line in a `.jsonl` file is a UTF-8 JSON object. The main graph's `manifest.json` records counts and snapshot metadata; consult its stated scope before using any coverage denominator. The following graph paths are relative to `v0.28.0/`:

- `knowledge-points/<subject>/<stage>/nodes.jsonl`: Concepts and Topics. `node_kind` distinguishes them; `key` is their stable identifier.
- `knowledge-points/<subject>/<stage>/edges.jsonl`: REFINES points from child to parent; PREREQUISITE points from prerequisite to successor. Some prerequisites cross stages; resolve endpoints against all node partitions.
- `keypoints/`: explanations associated through `kp_key`.
- `exercises/`: generated or independently authored exercises associated through `kp_keys`, with answers and explanations. Consult each record's provenance.
- `standards/nodes.jsonl` and `standards-alignment/covers.jsonl`: curriculum requirements, themes/subthemes, and Concept mappings.
- `textbook-alignment/`: volume metadata, chapter structure, and chapter-to-Concept mappings (TEACHES). The public package retains chapter positions, not original chapter titles or printed numbering.
- `keys/`, `index/`, and `changes/`: identifier governance, retrieval indexes, and release history.

The archive also contains `source-views-v0.28.0/`:

- `textbooks.jsonl`, `chapters.jsonl`, and `teaches.jsonl`: source-specific views using the existing Textbook, TextbookChapter, and TEACHES types. TEACHES targets are stable Concept keys from the main graph.
- `source-links.jsonl`: an auxiliary index associating `source_textbook_id` with `existing_textbook_ids` in the main graph. A nullable `preferred_textbook_id` does not resolve every edition ambiguity. This index introduces no new Concept or prerequisite type.
- `index.json`: source-view scope, counts, and integrity metadata, separate from the main graph's manifest.

In the source repository, `data/open/v0.28.0/` is Git-ignored and extracted during the build. The main graph is distributed in `data/edugraph-v0.28.0.tar.gz` with a companion SHA-256 checksum, rather than as individually tracked JSONL files.

## Interpretation and review status

Resource presence, catalog completeness, and mapping correctness are different properties. Reading source front/back matter is not a full-text audit. Across the earlier 980-source intake, 752 sources had recovered catalog candidates; this does not establish complete catalogs for those books. Missing supported TEACHES links mean no binding has been established, not that a textbook does not teach the Concept.

The Concepts added in v0.28.0 and v0.27.0, and those added or resource-completed in v0.26.0, all have explanations and exercises. Across the full inherited graph, ten historical physics Concepts still lack these resources. Historical review states are also retained: 125 KeyPoints and three exercises remain draft; these are outside this release's expansion/review scope. Existing `spot_checked` fields are inherited historical metadata, not new teacher judgments from this run.

New curriculum-based Concepts remain `draft`; new prerequisites remain `candidate`; COVERS links are `auto_matched`. Visible explanations and exercises in this release's review scope are `machine_reviewed`. Catalog refinements and independent source-view mappings retain their applicable draft/uncertain state. These labels describe different review stages and must not be collapsed into a claim of independent teacher verification.

The release passes the original structural, reference-integrity, release-scan, and manifest-consistency checks. These checks and machine semantic review support usability and traceability; they do not guarantee every educational statement or mapping is correct.

Shared prerequisites and publisher-specific teaching order describe different relationships. Course-module order is not automatically converted into prerequisite edges. The data does not contain real student histories or individualized learner states. Website figures retained from the paper or earlier site are historical illustrations; their Concept, subject, textbook, and coverage figures do not describe the current preview. Current totals are given by the manifests and tables above.

## License and source material

Structured public data: Creative Commons Attribution-ShareAlike 4.0 International, included as `LICENSE-DATA`. Retain attribution to EduGraph, the release identifier, and the license when redistributing. Consult the original records for resource-specific license information.

ChinaTextbook supplies the reference sources for the catalog expansion. Textbook PDFs, body text, OCR transcripts, and original catalog titles are not redistributed in this package. Textbook content and cover rights remain with their respective publishers and rights holders; they are not relicensed by EduGraph. Website cover previews retain their separate source notices.

The explorer code is distributed separately under Apache 2.0. Paper illustrations belong to the project-provided website materials and are not part of this data archive.
