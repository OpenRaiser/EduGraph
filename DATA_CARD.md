# EduGraph public data — v0.24.0

The download contains the EduGraph main graph (`v0.24.0/`), independent ChinaTextbook source catalog views (`source-views-v0.24.0/`), this data card, and the data license. The source views link to existing textbook records; they are not additional, disjoint textbooks to add to the main graph totals.

## Main graph

| Resource | Count |
|---|---:|
| Concepts | 5,269 |
| Topics | 1,322 |
| REFINES | 6,417 |
| PREREQUISITE | 4,882 |
| KeyPoints | 11,765 |
| Exercises | 7,107 |
| StandardItems | 2,844 |
| COVERS | 7,694 |
| Textbook volumes | 1,113 |
| Textbook chapters | 10,926 |
| TEACHES | 23,015 |

The graph covers ten subjects and three learning stages, organized into 24 subject/stage partitions. Relative to the previously public v0.21.0 release, the textbook layer adds 361 volume records, 4,048 chapter nodes, and 1,044 TEACHES edges. Concept, Topic, prerequisite, KeyPoint, exercise, and standard data are unchanged. Existing textbook identifiers and TEACHES records are retained; chapter traversal positions can change when subdivisions are inserted.

## ChinaTextbook source views

Source snapshot: [TapXWorld/ChinaTextbook at e2b3f62213c77bb8c33c5be355f97625ea1b8b61](https://github.com/TapXWorld/ChinaTextbook/tree/e2b3f62213c77bb8c33c5be355f97625ea1b8b61), checked on 2026-11-11.

The intake matches 980 main-textbook sources within the existing ten subjects. Matching uses subject, school system, textbook series/editor, grade, and volume; it does not certify identical publication editions. Of these sources, 957 match a single main-graph record and 23 retain multiple same-series edition candidates. Seventy-two activity manuals or supplementary readers are outside this intake.

The 361 sources added to the main graph are represented there. The remaining 619 sources are distributed separately as catalog views associated with existing books:

| Independent source-view resource | Count |
|---|---:|
| Source views | 619 |
| Sources with recovered catalog candidates | 391 |
| Sources without supported catalog structure yet | 228 |
| Chapter nodes | 4,451 |
| Candidate TEACHES edges | 359 |

These counts overlap with the main graph's textbook coverage and must not be added to its textbook totals. Each source preserves its own chapter order. We do not interleave alternative catalogs into a single order or convert textbook order into prerequisite edges.

## Read the data

Each nonempty line in a `.jsonl` file is a UTF-8 JSON object. The main graph's `manifest.json` records its counts, coverage denominators, and release metadata. The following graph paths are relative to `v0.24.0/`:

- `knowledge-points/<subject>/<stage>/nodes.jsonl`: Concepts and Topics. `node_kind` distinguishes them; `key` is their stable identifier.
- `knowledge-points/<subject>/<stage>/edges.jsonl`: `REFINES` points from child to parent; `PREREQUISITE` points from prerequisite to successor. Some prerequisites cross stages; resolve endpoints against all node partitions.
- `keypoints/`: explanations associated through `kp_key`.
- `exercises/`: independently authored exercises associated through `kp_keys`; includes answers and explanations.
- `standards/nodes.jsonl` and `standards-alignment/covers.jsonl`: requirements and their Concept mappings.
- `textbook-alignment/`: volume metadata, chapter structure, and chapter-to-Concept mappings (`TEACHES`). The public package retains chapter positions, not original chapter titles or printed numbering.
- `keys/`, `index/`, `changes/`: identifier governance, retrieval indexes and release history.

The archive also contains `source-views-v0.24.0/`:

- `textbooks.jsonl`, `chapters.jsonl`, and `teaches.jsonl`: source-specific views using the existing `Textbook`, `TextbookChapter`, and `TEACHES` types. TEACHES targets are stable Concept keys from the main graph.
- `source-links.jsonl`: an auxiliary index associating `source_textbook_id` with `existing_textbook_ids` in the main graph. A nullable `preferred_textbook_id` does not resolve all edition ambiguity. This index introduces no new Concept or prerequisite type.
- `index.json`: source-view scope, counts, and integrity metadata, separate from the main graph's manifest.

## Interpretation and review status

Resource presence, catalog completeness, and mapping correctness are different properties. Reading source front/back matter is not a full-text audit. Across all 980 intake sources, 752 have recovered catalog candidates; this does not establish complete catalogs for those books. A source without recovered chapters does not mean the textbook has no chapters. Likewise, no supported TEACHES edge means no binding was established, not that the book does not teach the Concept.

New subdivisions and mappings are conservative machine-generated candidates. Mappings created by the latest catalog refinement and independent source-view matching retain `review_status: "draft"` and `uncertain: true`; earlier intake and original records retain their existing provenance and review status. `machine_reviewed`, `draft`, and `auto_matched` do not imply independent teacher verification. Structural validation and successful loading check identifiers, references, and compatibility; they do not certify semantic correctness.

Shared graph prerequisites and publisher-specific teaching order describe different relationships. The data does not contain real student histories or individualized learner states. Figure illustrations retained in the website are paper snapshots from before this expansion; current resource totals are given by the manifests and tables above, not the old figure labels.

## License and source material

Structured public data: Creative Commons Attribution-ShareAlike 4.0 International, included as `LICENSE-DATA`. Retain attribution to EduGraph, the release identifier, and the license when redistributing. Consult the original records for resource-specific license information.

ChinaTextbook supplies the reference sources for the catalog expansion. Textbook PDFs, body text, OCR transcripts, and original catalog titles are not redistributed in this package. Textbook content and cover rights remain with their respective publishers and rights holders; they are not relicensed by EduGraph. Website cover previews retain their separate source notices.

The explorer code is distributed separately under Apache 2.0. Paper illustrations belong to the project-provided website materials and are not part of this data archive.
