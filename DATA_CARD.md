# EduGraph public data — v0.26.0 public preview

The download contains the EduGraph main graph (`v0.26.0/`), independent ChinaTextbook source catalog views (`source-views-v0.26.0/`), this data card, and the data license. This is a **public preview**. Curriculum-derived Concepts, prerequisite candidates, automatically matched curriculum links, and machine-reviewed learning resources retain their respective provenance and review status. Public availability and machine review do not certify independent teacher assessment.

Source views link to existing textbook records; they are not additional, disjoint textbooks to add to the main graph totals.

## Main graph

| Resource | Count |
|---|---:|
| Concepts | 7,062 |
| Topics | 1,498 |
| REFINES | 8,288 |
| PREREQUISITE | 5,871 |
| KeyPoints | 15,490 |
| Exercises | 8,900 |
| StandardItems | 3,764 |
| Curriculum themes / subthemes | 100 / 112 |
| COVERS | 10,115 |
| Textbook volumes | 1,161 |
| Textbook chapters | 12,607 |
| TEACHES | 23,411 |
| Subjects | 18 |
| Learning stages | 3 |
| Subject/stage partitions | 37 |

The graph covers mathematics, Chinese, English, physics, chemistry, biology, history, geography, politics, science, information technology, music, fine arts, integrated arts, Japanese, Russian, physical education and health, and general technology. The four subjects first introduced in this release—Japanese, Russian, physical education and health, and general technology—currently cover **senior secondary education only**. Music and fine arts now include primary and junior-secondary partitions; integrated arts now includes junior secondary. These totals do not imply that every subject spans all three stages.

## Additions since v0.25.0

This release adds **1,313 Concepts and 134 Topics** while retaining the identifiers and full node contents of the existing 5,749 Concepts. It also fills both explanation and exercise gaps for **311 existing Concepts** from the preceding arts-related expansion. Resource generation therefore covers 1,624 Concepts; resource review covers 1,793 Concepts, including 169 existing information-technology Concepts whose resources were already present.

| Subject expanded | New Concepts | Current Concepts | Current KeyPoints | Current exercises |
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

The release adds a net **3,387 KeyPoints**, **1,624 exercises**, **691 StandardItems**, and **1,839 COVERS edges**. The 691 additional StandardItems represent **662 distinct source requirements plus 29 stage projections**; a requirement projected to more than one learning stage is not counted as multiple independent source passages. Curriculum organization adds 58 ContentThemes and 112 ContentSubThemes.

This release runs the original dataset-construction pipeline through actual model-API generation: curriculum requirements are decomposed into candidate Concepts, checked for duplication and scope, assigned stable identifiers, and connected to generated explanations, exercises, and prerequisite proposals. Explanations and exercises are **model-generated educational resources, not textbook extracts**. Earlier records keep their original provenance; this release does not retroactively attribute them to the new run.

All visible learning resources in this release's expansion/review scope completed machine review. Eight newly generated KeyPoints were excluded following recorded review findings. The prerequisite graph was checked for cycles and invalid references, and transitive reduction preserves the reachability of historical prerequisites. A removed redundant direct edge can therefore remain represented by a multi-step path.

Textbook volumes, chapters, TEACHES links, and independent source views are unchanged from v0.25.0. In particular, new Concepts do not automatically receive textbook mappings. This release does **not** claim complete coverage of all ChinaTextbook materials.

## Curriculum sources used by this expansion

The expansion uses the selected requirements from the official documents below. The eight senior-secondary subjects use the **2017 curriculum standards revised in 2020** from the People's Education Press [official curriculum-standard collection](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/). Compulsory-education arts content uses the 2022 standard; Chinese calligraphy additions use the 2013 guideline. The source edition is recorded explicitly; this release does not claim to implement every later revision or every passage of each document.

| Scope | Official source document |
|---|---|
| Senior information technology | [普通高中信息技术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521187437000.pdf) |
| Senior music | [普通高中音乐课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521792634168.pdf) |
| Senior fine arts | [普通高中美术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517518487651706.pdf) |
| Senior integrated arts | [普通高中艺术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521458591016.pdf) |
| Senior general technology | [普通高中通用技术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517520410285510.pdf) |
| Senior physical education and health | [普通高中体育与健康课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517520130143580.pdf) |
| Senior Japanese | [普通高中日语课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517518796185803.pdf) |
| Senior Russian | [普通高中俄语课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517517065940620.pdf) |
| Compulsory-education music, fine arts, and integrated arts | [义务教育艺术课程标准（2022年版）](https://www.moe.gov.cn/srcsite/A26/s8001/202204/W020220420582364678888.pdf) |
| Chinese calligraphy | [中小学书法教育指导纲要（2013）](https://hudong.moe.gov.cn/srcsite/A26/s8001/201301/t20130125_147389.html) |

The public StandardItem records retain selected requirement text, source family, stage information, and Concept associations. Source documents are identified by the official links above. Original PDFs, OCR transcripts, generation/review archives, and page-level working evidence are not included in the public package. A curriculum link does not establish that every mapped textbook uses the same curriculum or publication edition.

## ChinaTextbook source views

Source snapshot: [TapXWorld/ChinaTextbook at e2b3f62213c77bb8c33c5be355f97625ea1b8b61](https://github.com/TapXWorld/ChinaTextbook/tree/e2b3f62213c77bb8c33c5be355f97625ea1b8b61), checked on 2026-11-11.

The earlier v0.24.0 intake matched 980 main-textbook sources within the original ten subjects. Matching used subject, school system, textbook series/editor, grade, and volume; it did not certify identical publication editions. Of these sources, 957 matched a single main-graph record and 23 retained multiple same-series edition candidates. Seventy-two activity manuals or supplementary readers were outside that intake. These are historical ten-subject intake statistics, not evidence of exhaustive coverage across the current eighteen subjects.

That intake added 361 textbook records, 4,048 chapter nodes, and 1,044 TEACHES edges relative to v0.21.0. The subsequent information-technology expansion added 48 textbook records, 1,681 chapter nodes, and 396 TEACHES edges. These records are retained unchanged in v0.26.0.

The other 619 matched sources remain independently organized catalog views associated with existing books:

| Independent source-view resource | Count |
|---|---:|
| Source views | 619 |
| Sources with recovered catalog candidates | 391 |
| Sources without supported catalog structure yet | 228 |
| Chapter nodes | 4,451 |
| Candidate TEACHES edges | 359 |

These views, chapters, and mappings originate from v0.24.0 and are **carried forward without new source-view content** in this release. The distribution directory is `source-views-v0.26.0/`; its index records the carried-forward provenance.

These counts overlap with the main graph's textbook coverage and must not be added to its textbook totals. Each source preserves its own chapter order. Alternative catalogs are not interleaved into a single order, and textbook order is not converted into prerequisite edges.

## Read the data

Each nonempty line in a `.jsonl` file is a UTF-8 JSON object. The main graph's `manifest.json` records counts and snapshot metadata; consult its stated scope before using any coverage denominator. The following graph paths are relative to `v0.26.0/`:

- `knowledge-points/<subject>/<stage>/nodes.jsonl`: Concepts and Topics. `node_kind` distinguishes them; `key` is their stable identifier.
- `knowledge-points/<subject>/<stage>/edges.jsonl`: REFINES points from child to parent; PREREQUISITE points from prerequisite to successor. Some prerequisites cross stages; resolve endpoints against all node partitions.
- `keypoints/`: explanations associated through `kp_key`.
- `exercises/`: generated or independently authored exercises associated through `kp_keys`, with answers and explanations. Consult each record's provenance.
- `standards/nodes.jsonl` and `standards-alignment/covers.jsonl`: curriculum requirements, themes/subthemes, and Concept mappings.
- `textbook-alignment/`: volume metadata, chapter structure, and chapter-to-Concept mappings (TEACHES). The public package retains chapter positions, not original chapter titles or printed numbering.
- `keys/`, `index/`, and `changes/`: identifier governance, retrieval indexes, and release history.

The archive also contains `source-views-v0.26.0/`:

- `textbooks.jsonl`, `chapters.jsonl`, and `teaches.jsonl`: source-specific views using the existing Textbook, TextbookChapter, and TEACHES types. TEACHES targets are stable Concept keys from the main graph.
- `source-links.jsonl`: an auxiliary index associating `source_textbook_id` with `existing_textbook_ids` in the main graph. A nullable `preferred_textbook_id` does not resolve every edition ambiguity. This index introduces no new Concept or prerequisite type.
- `index.json`: source-view scope, counts, and integrity metadata, separate from the main graph's manifest.

In the source repository, `data/open/v0.26.0/` is Git-ignored and extracted during the build. The main graph is distributed in `data/edugraph-v0.26.0.tar.gz` with a companion SHA-256 checksum, rather than as individually tracked JSONL files.

## Interpretation and review status

Resource presence, catalog completeness, and mapping correctness are different properties. Reading source front/back matter is not a full-text audit. Across the earlier 980-source intake, 752 sources had recovered catalog candidates; this does not establish complete catalogs for those books. Missing supported TEACHES links mean no binding has been established, not that a textbook does not teach the Concept.

The newly added and resource-completed Concepts all have explanations and exercises. Across the full inherited graph, ten historical physics Concepts still lack these resources. Historical review states are also retained: 125 KeyPoints and three exercises remain draft; these are outside this release's expansion/review scope. Existing `spot_checked` fields are inherited historical metadata, not new teacher judgments from this run.

New curriculum-based Concepts remain `draft`; new prerequisites remain `candidate`; COVERS links are `auto_matched`. Visible explanations and exercises in this release's review scope are `machine_reviewed`. Catalog refinements and independent source-view mappings retain their applicable draft/uncertain state. These labels describe different review stages and must not be collapsed into a claim of independent teacher verification.

The release passes the original structural, reference-integrity, release-scan, and manifest-consistency checks. These checks and machine semantic review support usability and traceability; they do not guarantee every educational statement or mapping is correct.

Shared prerequisites and publisher-specific teaching order describe different relationships. Course-module order is not automatically converted into prerequisite edges. The data does not contain real student histories or individualized learner states. Website figures retained from the paper or earlier site are historical illustrations; their Concept, subject, textbook, and coverage figures do not describe the current preview. Current totals are given by the manifests and tables above.

## License and source material

Structured public data: Creative Commons Attribution-ShareAlike 4.0 International, included as `LICENSE-DATA`. Retain attribution to EduGraph, the release identifier, and the license when redistributing. Consult the original records for resource-specific license information.

ChinaTextbook supplies the reference sources for the catalog expansion. Textbook PDFs, body text, OCR transcripts, and original catalog titles are not redistributed in this package. Textbook content and cover rights remain with their respective publishers and rights holders; they are not relicensed by EduGraph. Website cover previews retain their separate source notices.

The explorer code is distributed separately under Apache 2.0. Paper illustrations belong to the project-provided website materials and are not part of this data archive.
