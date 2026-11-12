# EduGraph public data — v0.25.0 public preview

The download contains the EduGraph main graph (`v0.25.0/`), independent ChinaTextbook source catalog views (`source-views-v0.25.0/`), this data card, and the data license. This is a **public preview**: newly added records retain their draft or candidate status. Public availability does not certify independent teacher review. Source views link to existing textbook records; they are not additional, disjoint textbooks to add to the main graph totals.

## Main graph

| Resource | Count |
|---|---:|
| Concepts | 5,749 |
| Topics | 1,364 |
| REFINES | 6,897 |
| PREREQUISITE | 4,994 |
| KeyPoints | 12,103 |
| Exercises | 7,276 |
| StandardItems | 3,073 |
| COVERS | 8,276 |
| Textbook volumes | 1,161 |
| Textbook chapters | 12,607 |
| TEACHES | 23,411 |
| Subjects | 14 |
| Subject/stage partitions | 28 |

The graph covers fourteen subjects across three learning stages, with 28 populated subject/stage partitions. The existing ten subjects are mathematics, Chinese, English, physics, chemistry, biology, history, geography, politics, and science. The four additions—information technology, music, fine arts, and integrated arts—currently cover **senior secondary education only**. These totals do not imply that every subject spans all three stages.

## Additions since v0.24.0

The preview adds 480 Concepts, 42 Topics, 480 REFINES edges, 229 StandardItems, and 582 COVERS edges:

| New senior-secondary partition | Concepts | Topics | StandardItems | COVERS |
|---|---:|---:|---:|---:|
| Information technology | 169 | 10 | 75 | 181 |
| Music | 92 | 12 | 62 | 150 |
| Fine arts | 157 | 12 | 54 | 185 |
| Integrated arts | 62 | 8 | 38 | 66 |

Information technology additionally contributes 338 KeyPoints, 169 exercises, 112 prerequisite edges, 48 textbook records, 1,681 chapter nodes, and 396 TEACHES edges. The music, fine-arts, and integrated-arts partitions currently contain curriculum requirements, Concepts, Topics, and their COVERS/REFINES links; this batch adds **no KeyPoints, exercises, prerequisites, or textbook mappings for those three subjects**. Coverage of curriculum modules is not a claim of exhaustive textbook-content coverage.

New Concepts and learning resources were authored and checked by the assistant in the current work session, using curriculum evidence and the existing EduGraph schema. **The original pipeline's external model-API generation was not executed for this expansion.** The new content must not be described as an original API run or as teacher-approved material. The source and review fields preserve the applicable draft, candidate, or automatically matched status.

The existing v0.24.0 data are retained. Historically, v0.24.0 added 361 textbook records, 4,048 chapter nodes, and 1,044 TEACHES edges relative to v0.21.0, while its non-textbook layers were unchanged. That statement describes the earlier release, not the current four-subject expansion. Existing textbook identifiers and associations remain distinct from source-specific catalog views.

## Curriculum sources for the new subjects

All four new partitions use the **2017 senior-secondary curriculum standards revised in 2020**, acquired from the People's Education Press [official curriculum-standard collection](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/). This preview does not claim to implement the 2025 revisions or the latest available standards.

| New partition | Official source document |
|---|---|
| Information technology | [普通高中信息技术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521187437000.pdf) |
| Music | [普通高中音乐课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521792634168.pdf) |
| Fine arts | [普通高中美术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517518487651706.pdf) |
| Integrated arts | [普通高中艺术课程标准（2017年版2020年修订）](https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517521458591016.pdf) |

The public `StandardItem` records retain the selected requirement text and its Concept associations. Original PDFs, extraction transcripts, and the private page-level evidence ledger are not copied into this public package; the links above identify the source documents. Source edition is distinct from textbook edition, and a curriculum link does not certify that every mapped textbook uses the same edition.

## ChinaTextbook source views

Source snapshot: [TapXWorld/ChinaTextbook at e2b3f62213c77bb8c33c5be355f97625ea1b8b61](https://github.com/TapXWorld/ChinaTextbook/tree/e2b3f62213c77bb8c33c5be355f97625ea1b8b61), checked on 2026-11-11.

The earlier v0.24.0 intake matched 980 main-textbook sources within the original ten subjects. Matching used subject, school system, textbook series/editor, grade, and volume; it did not certify identical publication editions. Of these sources, 957 matched a single main-graph record and 23 retained multiple same-series edition candidates. Seventy-two activity manuals or supplementary readers were outside that intake. These are the retained ten-subject intake statistics, not a new count of the information-technology additions.

Within that earlier intake, 361 sources were added to the main graph. The remaining 619 sources are distributed separately as catalog views associated with existing books:

| Independent source-view resource | Count |
|---|---:|
| Source views | 619 |
| Sources with recovered catalog candidates | 391 |
| Sources without supported catalog structure yet | 228 |
| Chapter nodes | 4,451 |
| Candidate TEACHES edges | 359 |

These views, their 4,451 chapters, and their 359 candidate mappings are **carried forward from v0.24.0**, with no new source-view content claimed in this preview. The directory is now named `source-views-v0.25.0/`; `index.json` records the prior version through `carried_from`.

These counts overlap with the main graph's textbook coverage and must not be added to its textbook totals. Each source preserves its own chapter order. We do not interleave alternative catalogs into a single order or convert textbook order into prerequisite edges.

## Read the data

Each nonempty line in a `.jsonl` file is a UTF-8 JSON object. The main graph's `manifest.json` records its counts and snapshot metadata; consult its stated scope before using any coverage denominator. The following graph paths are relative to `v0.25.0/`:

- `knowledge-points/<subject>/<stage>/nodes.jsonl`: Concepts and Topics. `node_kind` distinguishes them; `key` is their stable identifier.
- `knowledge-points/<subject>/<stage>/edges.jsonl`: `REFINES` points from child to parent; `PREREQUISITE` points from prerequisite to successor. Some prerequisites cross stages; resolve endpoints against all node partitions.
- `keypoints/`: explanations associated through `kp_key`.
- `exercises/`: independently authored exercises associated through `kp_keys`; includes answers and explanations.
- `standards/nodes.jsonl` and `standards-alignment/covers.jsonl`: requirements and their Concept mappings.
- `textbook-alignment/`: volume metadata, chapter structure, and chapter-to-Concept mappings (`TEACHES`). The public package retains chapter positions, not original chapter titles or printed numbering.
- `keys/`, `index/`, `changes/`: identifier governance, retrieval indexes and release history.

The archive also contains `source-views-v0.25.0/`:

- `textbooks.jsonl`, `chapters.jsonl`, and `teaches.jsonl`: source-specific views using the existing `Textbook`, `TextbookChapter`, and `TEACHES` types. TEACHES targets are stable Concept keys from the main graph.
- `source-links.jsonl`: an auxiliary index associating `source_textbook_id` with `existing_textbook_ids` in the main graph. A nullable `preferred_textbook_id` does not resolve all edition ambiguity. This index introduces no new Concept or prerequisite type.
- `index.json`: source-view scope, counts, and integrity metadata, separate from the main graph's manifest.

In the source repository, `data/open/v0.25.0/` is Git-ignored and extracted during the build. The main graph is distributed in `data/edugraph-v0.25.0.tar.gz` with a companion SHA-256 checksum, rather than as individually tracked JSONL files.

## Interpretation and review status

Resource presence, catalog completeness, and mapping correctness are different properties. Reading source front/back matter is not a full-text audit. Across the earlier 980-source intake, 752 sources had recovered catalog candidates; this does not establish complete catalogs for those books. A source without recovered chapters does not mean the textbook has no chapters. Likewise, no supported TEACHES edge means no binding was established, not that the book does not teach the Concept. Newly added music, fine-arts, and integrated-arts Concepts may therefore have empty resource lists in the explorer.

New subdivisions and mappings are candidates. Mappings from the prior catalog refinement and independent source-view matching retain `review_status: "draft"` and `uncertain: true`; earlier intake and original records retain their existing provenance and review status. New curriculum-based Concepts remain drafts, and automatic COVERS links are not teacher judgments. `machine_reviewed`, `draft`, and `auto_matched` do not imply independent teacher verification. Source checks and agent cross-review are distinct from teacher assessment. Structural validation and successful loading check identifiers, references, and compatibility; they do not certify semantic correctness.

Shared graph prerequisites and publisher-specific teaching order describe different relationships. Course-module order is not automatically converted into prerequisite edges. The data does not contain real student histories or individualized learner states. Figure illustrations retained in the website are paper or earlier-site snapshots from before this expansion; their Concept, subject, textbook, and coverage figures do not describe the current preview. Current totals are given by the manifests and tables above.

## License and source material

Structured public data: Creative Commons Attribution-ShareAlike 4.0 International, included as `LICENSE-DATA`. Retain attribution to EduGraph, the release identifier, and the license when redistributing. Consult the original records for resource-specific license information.

ChinaTextbook supplies the reference sources for the catalog expansion. Textbook PDFs, body text, OCR transcripts, and original catalog titles are not redistributed in this package. Textbook content and cover rights remain with their respective publishers and rights holders; they are not relicensed by EduGraph. Website cover previews retain their separate source notices.

The explorer code is distributed separately under Apache 2.0. Paper illustrations belong to the project-provided website materials and are not part of this data archive.
