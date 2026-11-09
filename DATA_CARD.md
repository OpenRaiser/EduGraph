# EduGraph public data — v0.21.0

This archive contains the public v0.21.0 JSONL release from the EduGraph complete project delivery of 2026-11-07, plus its data license. The original release records are preserved without editing.

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
| Textbook volumes | 752 |
| Textbook chapters | 6,878 |
| TEACHES | 21,971 |

## Read the data

Each nonempty line in a `.jsonl` file is a UTF-8 JSON object. The version's `manifest.json` records counts, coverage denominators and release metadata.

- `knowledge-points/<subject>/<stage>/nodes.jsonl`: Concepts and Topics. `node_kind` distinguishes them; `key` is their stable identifier.
- `knowledge-points/<subject>/<stage>/edges.jsonl`: `REFINES` points from child to parent; `PREREQUISITE` points from prerequisite to successor. Some prerequisites cross stages; resolve endpoints against all node partitions.
- `keypoints/`: explanations associated through `kp_key`.
- `exercises/`: independently authored exercises associated through `kp_keys`; includes answers and explanations.
- `standards/nodes.jsonl` and `standards-alignment/covers.jsonl`: requirements and their Concept mappings.
- `textbook-alignment/`: volume metadata, chapter structure, and chapter-to-Concept mappings (`TEACHES`). The public package retains chapter positions, not original chapter titles or printed numbering.
- `keys/`, `index/`, `changes/`: identifier governance, retrieval indexes and release history.

## Interpretation

Resource presence is distinct from mapping correctness. Records retain provenance and review status; `machine_reviewed`, `draft` and `auto_matched` do not imply independent human verification. Shared graph prerequisites and publisher-specific teaching order describe different relationships. The data does not contain real student histories or individualized learner states.

## License

Data: Creative Commons Attribution-ShareAlike 4.0 International, included as `LICENSE-DATA`. Retain attribution to EduGraph, the release identifier, and the license when redistributing. Consult the original records for resource-specific license information.

The explorer code is distributed separately under Apache 2.0. Paper illustrations belong to the project-provided website materials and are not part of this data archive.
