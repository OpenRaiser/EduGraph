# EduGraph Data Card

EduGraph is an open K–12 knowledge graph and educational data infrastructure. It connects curriculum requirements, Concepts, Topics, prerequisites, textbook catalogs, explanations, and exercises through stable identifiers. The public package supports knowledge retrieval, textbook comparison, learning-path queries, and educational Agent context construction.

## Contents and scope

The knowledge graph spans **18 subjects** and **three learning stages: primary, junior secondary, and senior secondary**. It contains 41 subject/stage knowledge partitions.

| Knowledge and relations | Count | Teaching resources | Count |
|---|---:|---|---:|
| Concepts | 8,938 | KeyPoints | 19,562 |
| Topics | 1,676 | Exercises | 10,795 |
| PREREQUISITE edges | 6,447 | StandardItems | 5,463 |
| REFINES edges | 10,303 | Textbook volumes | 1,161 |
| COVERS edges | 13,636 | Textbook chapters | 12,607 |
| TEACHES edges | 23,411 | Subjects / stages | 18 / 3 |

Curriculum organization also includes **255 ContentThemes** and **681 ContentSubThemes**. The manifest's `standard_items` counter includes these organizational nodes, for a total of 6,399 curriculum nodes; the StandardItem row above counts requirement records.

**Subjects:** mathematics, Chinese, English, physics, chemistry, biology, history, geography, politics, science, information technology, music, fine arts, integrated arts, Japanese, Russian, physical education and health, and general technology. Subject/stage metadata identifies the scope of each record. Japanese and Russian include junior and senior secondary partitions; general technology and information technology include senior secondary; integrated arts includes junior and senior secondary knowledge partitions.

## Textbook catalog views

Independent textbook-source views organize each source's catalog separately while linking its chapters to shared Concept identifiers.

| Source-view resource | Count |
|---|---:|
| Independent catalog views | 1,203 |
| Views with catalog structure | 992 |
| Catalog chapter nodes | 11,212 |
| Chapter-to-Concept mappings | 2,666 |

A view can link to one or more main-graph textbook candidates. Source-view and main-graph textbook counts are reported separately. Each catalog preserves its own hierarchy, chapter order, and recorded page positions. The explorer also exposes a primary integrated-arts source-catalog partition.

Textbook order describes a publisher's teaching arrangement. PREREQUISITE describes dependencies in the shared knowledge graph. Keeping these relations separate supports comparisons across textbooks while preserving the common knowledge structure.

## Data organization

Each nonempty line of a `.jsonl` file is a UTF-8 JSON object. The main-graph directory contains:

| Path | Contents and identifiers |
|---|---|
| `knowledge-points/<subject>/<stage>/nodes.jsonl` | Concepts and Topics; `key` is the stable identifier and `node_kind` distinguishes the node classes. |
| `knowledge-points/<subject>/<stage>/edges.jsonl` | REFINES and PREREQUISITE edges, with `from` and `to` endpoints. |
| `keypoints/` | Explanations linked by `kp_key`. |
| `exercises/` | Exercises, answers, and explanations linked by `kp_keys`. |
| `standards/nodes.jsonl` | Curriculum requirements, themes, and subthemes. |
| `standards-alignment/covers.jsonl` | Curriculum-to-Concept COVERS edges. |
| `textbook-alignment/` | Textbook metadata, chapter hierarchy, and TEACHES mappings. |
| `keys/`, `index/`, `changes/` | Identifier management, retrieval indexes, and change records. |
| `manifest.json` | Counts, partition metadata, and snapshot identity. |

The independent catalog-view directory contains:

| File | Contents |
|---|---|
| `textbooks.jsonl` | Source-specific Textbook metadata. |
| `chapters.jsonl` | TextbookChapter records with source-specific hierarchy and order. |
| `teaches.jsonl` | TEACHES mappings to main-graph Concept keys. |
| `source-links.jsonl` | Source identifiers, original links, and candidate main-graph textbook associations. |
| `index.json` | Scope, counts, and SHA-256 file checksums. |

The repository's `data/release.json` identifies the packaged main graph and catalog directory. The [download page](https://openraiser.github.io/EduGraph/#/about) provides the complete data archive and its checksum. Each archive includes this data card and the data license.

## Relationship semantics

| Relationship | Direction | Purpose |
|---|---|---|
| REFINES | Child node → parent Topic | Knowledge taxonomy and hierarchy. |
| PREREQUISITE | Prerequisite Concept → successor Concept | Dependency traversal and learning order. |
| COVERS | StandardItem → Concept | Curriculum grounding. |
| TEACHES | TextbookChapter → Concept | Teaching location and role, including primary teaching, review, and mention. |

Resolve prerequisite endpoints across all subject/stage partitions to support cross-stage paths. A learning path returns a feasible order under the recorded prerequisites and the supplied known-Concept set. Browser mastery selections are stored locally.

For durable references, use the Concept `key`. Browser `id` values index the current build. Resource shards expose explanations, exercises, curriculum links, textbook mappings, and independent catalog mappings associated with each Concept.

## Provenance and review metadata

Records retain source attribution, authorship, and applicable review fields. Curriculum requirements are tied to source documents; learning resources include generated and independently authored explanations and exercises. Catalog metadata and mappings retain their evidence and review method identifiers.

| Field value | Meaning |
|---|---|
| `draft` / `candidate` | A recorded candidate with its provenance and current review state. |
| `auto_matched` | An association produced by the matching process. |
| `machine_reviewed` | Automated review using the model or deterministic method recorded in the metadata. |
| `spot_checked` | A recorded spot-check designation; consult the corresponding provenance. |
| `uncertain` | The record's explicit uncertainty flag. |

These fields describe individual records. Model or code review is distinct from teacher assessment. [Source attribution](https://github.com/OpenRaiser/EduGraph/blob/main/docs/SOURCES.md) provides curriculum-document references and textbook-source acknowledgements.

## Access and reuse

- **Explore:** search by keyword, subject, and stage in the [online explorer](https://openraiser.github.io/EduGraph/).
- **Query:** reuse the repository's JavaScript retrieval and graph modules for neighbors, learning paths, and associated resources.
- **Download:** use the JSONL archive and verify its SHA-256 checksum.
- **Validate:** the build checks identifiers, relation endpoints, prerequisite cycles, resource counts, and public-package contents.

## License

Structured public data is distributed under **Creative Commons Attribution-ShareAlike 4.0 International**, included as `LICENSE-DATA`. Retain EduGraph attribution and the license when redistributing, and consult record-level provenance for resource-specific terms.

The explorer code uses **Apache 2.0**. Textbook content and cover artwork remain the property of their respective publishers and rights holders. Cover previews carry a separate [source notice](https://github.com/OpenRaiser/EduGraph/blob/main/web/assets/covers/NOTICE.txt).
