/**
 * 倒排检索与 BM25 打分。API 1 的核心。
 *
 * 三路召回融合：
 *   1. 别名精确命中（alias_exact）—— 权重最高，几乎确定是用户想找的知识点
 *   2. bigram BM25（bigram_bm25）—— 通用召回
 *   3. 层级路径命中（path_hit）—— 命中所属主题名，弱信号但能纠正学科走偏
 *
 * 为什么要融合而不是只用 BM25：BM25 对短 query（就是一个知识点名）表现很好，
 * 但对长 query（一整道题）会被情境噪声淹没；而别名精确匹配对短 query 是降维打击，
 * 对长 query 又能作为术语抽取器。两者的失效场景恰好互补。
 *
 * 可解释性是硬要求：纯字面检索一定会有排序错乱的情况，若不返回命中理由，
 * 人工审核就无从下手 —— 只能看到「结果不对」而不知道为什么不对。
 */

import { normalize, tokenize, termFreq, AliasDict, isLongQuery, MAX_QUERY_LENGTH } from "./tokenize.mjs";

/** BM25 参数。k1 控制词频饱和，b 控制文档长度归一。 */
export const BM25_K1 = 1.2;
export const BM25_B = 0.6;

/**
 * b 取 0.6 而非常用的 0.75：知识点文档极短（名称 + 别名 + 路径，通常 10–40 个 term），
 * 长度差异主要来自别名数量的多少，而别名多不代表该知识点更不相关。
 * b 越大越惩罚长文档，0.75 会让别名丰富的知识点被系统性压低，与检索意图相反。
 */

/** 三路召回的融合权重。 */
export const WEIGHT_ALIAS_EXACT = 12.0;
export const WEIGHT_BM25 = 1.0;
export const WEIGHT_PATH_HIT = 0.6;

/**
 * `search()` 的 limit / offset 钳制上限。
 *
 * ## 这两个数**不是**性能保护
 *
 * 打分阶段已经遍历过分片里的每一个文档（三路召回都是全量扫），代价与 limit 无关；
 * limit 只决定最后 `scored.slice()` 取多少条，是 O(limit) 的。所以把上限调大
 * 不会放大任何 CPU 面 —— 真正的 CPU 上限是 query 长度，那个由 MAX_QUERY_LENGTH 管。
 * 这两个数的唯一作用是防止调用方传一个荒谬的值把响应体撑大。
 *
 * ## 为什么必须容得下「服务端的 offset 上限 + limit 上限」
 *
 * 原值是 limit 200 / offset 10000。200 恰好等于服务端的 limit 上限，**看起来对齐，
 * 实际错位**：`/api/search` 做多分片合并时必须按 `offset + limit` 的窗口向每个分片
 * 取数（否则某片的高分结果会被本片的分页窗口切掉，见 search.mjs 的取数注释），
 * 所以它传进来的 limit 是 `offset + limit`，能达到 100200。
 *
 * 于是 offset ≥ 200 的翻页被这里静默切成空页 —— 实测 science/junior 的 `q=物质`
 * 共 304 条命中，`offset=200` 起每一页都是 `items: []`，而 total 停在 200。
 * 调用方看到的是「这份数据只有 200 条」，这正是 security.mjs 的 clampInt 注释
 * 点名要避免的那种误解（「越界即报错而不是静默截断：调用方请求 limit=10000
 * 却拿到 200 条，会以为『数据只有 200 条』，这个误解比一个 400 更难发现」）——
 * 参数层做到了，库内部这一层没有。
 *
 * 写成加法而不是一个字面量，是为了让「它必须 ≥ 服务端最大窗口」这个约束
 * 留在代码里：改服务端上限时这里跟着变，而不是等下一次静默截断被发现。
 */
export const MAX_SEARCH_OFFSET = 100000;
export const MAX_SEARCH_LIMIT = MAX_SEARCH_OFFSET + 200;

/**
 * 倒排索引。
 *
 * 结构刻意保持可序列化为 JSONL：构建期落盘，运行期直接加载，不做任何训练或重建。
 */
export class InvertedIndex {
  constructor() {
    /** @type {Map<string, Array<[number, number]>>} term → [[docId, tf], ...] */
    this.postings = new Map();
    /** @type {string[]} docId → key */
    this.docKeys = [];
    /** @type {number[]} docId → 文档长度（term 数） */
    this.docLens = [];
    /** @type {Map<string, number>} key → docId */
    this.keyToDoc = new Map();
    /** @type {AliasDict} */
    this.aliasDict = new AliasDict();
    /** @type {Map<number, Set<string>>} docId → 路径词集合 */
    this.docPathTerms = new Map();
    /** @type {number} */
    this.totalLen = 0;
  }

  get docCount() {
    return this.docKeys.length;
  }

  get avgDocLen() {
    return this.docCount === 0 ? 0 : this.totalLen / this.docCount;
  }

  /**
   * 加入一个知识点文档。
   *
   * @param {{
   *   key: string,
   *   name: string,
   *   aliases?: string[],
   *   levelPath?: string[],
   * }} doc
   */
  addDoc(doc) {
    if (this.keyToDoc.has(doc.key)) {
      throw new Error(`索引中 key 重复：${doc.key}`);
    }
    const docId = this.docKeys.length;
    this.docKeys.push(doc.key);
    this.keyToDoc.set(doc.key, docId);

    // 索引文本 = 名称 + 别名 + 层级路径。三者都参与 bigram，但路径另有单独通道。
    const parts = [doc.name, ...(doc.aliases ?? []), ...(doc.levelPath ?? [])];
    const tf = termFreq(parts.join(" "));

    let len = 0;
    for (const [term, freq] of tf) {
      if (!this.postings.has(term)) this.postings.set(term, []);
      this.postings.get(term).push([docId, freq]);
      len += freq;
    }
    this.docLens.push(len);
    this.totalLen += len;

    // 别名词典：名称与别名都作为可精确匹配的术语
    this.aliasDict.add(doc.name, doc.key);
    for (const a of doc.aliases ?? []) this.aliasDict.add(a, doc.key);

    // 路径词单独存一份，用于 path_hit 通道
    const pathTerms = new Set();
    for (const seg of doc.levelPath ?? []) {
      for (const t of tokenize(seg)) pathTerms.add(t);
    }
    if (pathTerms.size > 0) this.docPathTerms.set(docId, pathTerms);

    return docId;
  }

  /** idf。用 BM25 的概率式 idf，并加 1 防止高频 term 出现负值。 */
  idf(term) {
    const df = this.postings.get(term)?.length ?? 0;
    if (df === 0) return 0;
    const N = this.docCount;
    return Math.log(1 + (N - df + 0.5) / (df + 0.5));
  }

  /**
   * 序列化为可落盘结构。
   * @returns {{ postings: Array<{term:string, df:number, postings:Array<[number,number]>}>, stats: any }}
   */
  serialize() {
    const postings = [];
    for (const [term, list] of [...this.postings.entries()].sort()) {
      postings.push({ term, df: list.length, postings: list });
    }
    return {
      postings,
      stats: {
        doc_count: this.docCount,
        total_len: this.totalLen,
        avg_doc_len: this.avgDocLen,
        doc_keys: this.docKeys,
        doc_lens: this.docLens,
      },
    };
  }

  /**
   * 从落盘结构恢复。
   * @param {{ postings: Array<{term:string, postings:Array<[number,number]>}>, stats: any, docs?: Array<{key:string,name:string,aliases?:string[],levelPath?:string[]}> }} data
   */
  static deserialize(data) {
    const idx = new InvertedIndex();
    const stats = data.stats ?? {};
    idx.docKeys = stats.doc_keys ?? [];
    idx.docLens = stats.doc_lens ?? [];
    idx.totalLen = stats.total_len ?? idx.docLens.reduce((a, b) => a + b, 0);
    idx.docKeys.forEach((k, i) => idx.keyToDoc.set(k, i));
    for (const row of data.postings ?? []) {
      idx.postings.set(row.term, row.postings);
    }
    // 别名词典与路径词无法从倒排表反推，必须由调用方补喂
    for (const d of data.docs ?? []) {
      idx.aliasDict.add(d.name, d.key);
      for (const a of d.aliases ?? []) idx.aliasDict.add(a, d.key);
      const docId = idx.keyToDoc.get(d.key);
      if (docId != null && d.levelPath?.length) {
        const set = new Set();
        for (const seg of d.levelPath) for (const t of tokenize(seg)) set.add(t);
        idx.docPathTerms.set(docId, set);
      }
    }
    return idx;
  }
}

/**
 * 检索。
 *
 * @param {InvertedIndex} index
 * @param {string} query
 * @param {{ limit?: number, offset?: number, minScore?: number }} [opts]
 * @returns {{
 *   query_length: number,
 *   strategy: "short"|"long",
 *   total: number,
 *   items: Array<{
 *     key: string,
 *     score: number,
 *     match_kinds: string[],
 *     matched_terms: string[],
 *     matched_aliases: string[],
 *     score_breakdown: { alias_exact: number, bigram_bm25: number, path_hit: number },
 *   }>,
 * }}
 */
export function search(index, query, opts = {}) {
  const limit = clampInt(opts.limit, 1, MAX_SEARCH_LIMIT, 20);
  const offset = clampInt(opts.offset, 0, MAX_SEARCH_OFFSET, 0);
  const minScore = typeof opts.minScore === "number" ? opts.minScore : 0;

  const raw = typeof query === "string" ? query.slice(0, MAX_QUERY_LENGTH) : "";
  const normalized = normalize(raw);
  const long = isLongQuery(raw);

  /** @type {Map<number, {alias:number, bm25:number, path:number, terms:Set<string>, aliases:Set<string>}>} */
  const acc = new Map();
  const bucket = (docId) => {
    let b = acc.get(docId);
    if (!b) {
      b = { alias: 0, bm25: 0, path: 0, terms: new Set(), aliases: new Set() };
      acc.set(docId, b);
    }
    return b;
  };

  // ---- 通道 1：别名精确命中 ----
  const aliasHits = index.aliasDict.extract(raw);
  for (const hit of aliasHits) {
    // 命中的别名越长，指示性越强：「一元一次方程」比「方程」可信得多
    const specificity = Math.log2(1 + hit.length);
    // 一个别名映射到多个知识点时按数量摊薄，避免歧义别名把多个结果一起顶上去
    const share = 1 / Math.max(1, hit.keys.length);
    for (const key of hit.keys) {
      const docId = index.keyToDoc.get(key);
      if (docId == null) continue;
      const b = bucket(docId);
      b.alias += WEIGHT_ALIAS_EXACT * specificity * share;
      b.aliases.add(hit.alias);
    }
  }

  // ---- 通道 2：bigram BM25 ----
  // 长 query 只对抽取出的术语打分，不对整段文本打分。
  // 直接对整道题做 bigram 会产生几百个情境噪声 term，把真正的术语彻底淹没。
  const bm25Source = long && aliasHits.length > 0 ? aliasHits.map((h) => h.alias).join(" ") : raw;
  const qtf = termFreq(bm25Source);
  const avgdl = index.avgDocLen || 1;

  for (const [term, qf] of qtf) {
    const list = index.postings.get(term);
    if (!list) continue;
    const idf = index.idf(term);
    if (idf <= 0) continue;
    for (const [docId, tf] of list) {
      const dl = index.docLens[docId] ?? 0;
      const denom = tf + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgdl));
      const s = idf * ((tf * (BM25_K1 + 1)) / (denom || 1));
      const b = bucket(docId);
      b.bm25 += WEIGHT_BM25 * s * Math.min(qf, 3);
      b.terms.add(term);
    }
  }

  // ---- 通道 3：层级路径命中 ----
  // 弱信号，作用是纠正学科/主题走偏：query 里出现「几何」时，几何主题下的知识点应略微上浮。
  if (index.docPathTerms.size > 0) {
    for (const [docId, pathTerms] of index.docPathTerms) {
      let hits = 0;
      for (const term of qtf.keys()) {
        if (pathTerms.has(term)) hits += 1;
      }
      if (hits > 0) {
        const b = bucket(docId);
        b.path += WEIGHT_PATH_HIT * Math.log2(1 + hits);
      }
    }
  }

  // ---- 融合与排序 ----
  const scored = [];
  for (const [docId, b] of acc) {
    const score = b.alias + b.bm25 + b.path;
    if (score <= minScore) continue;
    const kinds = [];
    if (b.alias > 0) kinds.push("alias_exact");
    if (b.bm25 > 0) kinds.push("bigram_bm25");
    if (b.path > 0) kinds.push("path_hit");
    scored.push({
      key: index.docKeys[docId],
      score: round4(score),
      match_kinds: kinds,
      matched_terms: [...b.terms].sort(),
      matched_aliases: [...b.aliases].sort(),
      score_breakdown: {
        alias_exact: round4(b.alias),
        bigram_bm25: round4(b.bm25),
        path_hit: round4(b.path),
      },
    });
  }

  // 同分时按 key 字典序，保证结果稳定可复现（否则分页会错乱）
  scored.sort((a, b) => (b.score - a.score) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  return {
    query_length: [...normalized].length,
    strategy: long ? "long" : "short",
    total: scored.length,
    items: scored.slice(offset, offset + limit),
  };
}

/**
 * 整数钳制。所有来自 HTTP 的数值参数都必须过这一步。
 *
 * 刻意用严格解析而不是 parseInt：parseInt("1e999") === 1、parseInt("3abc") === 3，
 * 会静默取前缀，导致调用方传了巨大值却拿到 1 这种反直觉结果。
 * 格式不合法一律回落默认值，行为可预测。
 *
 * @param {unknown} v
 * @param {number} min
 * @param {number} max
 * @param {number} dflt
 */
export function clampInt(v, min, max, dflt) {
  let n = NaN;
  if (typeof v === "number") {
    n = v;
  } else if (typeof v === "string") {
    const t = v.trim();
    // 只接受完整的十进制数字面量，拒绝 0x10 / 3abc / Infinity 这类写法
    if (t && /^[+-]?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(t)) n = Number(t);
  }
  if (!Number.isFinite(n)) return dflt;
  n = Math.trunc(n);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}
