/**
 * 分词与归一。运行期零依赖、完全离线，因此不能用任何分词库或 embedding。
 *
 * 中文没有词边界，而我们又不能引入词典分词器，所以走 **bigram**（二元切分）：
 * 「相反数」→ 相反 / 反数。这是纯字面检索在无分词器条件下的标准做法，
 * 代价是会产生跨词边界的噪声 bigram（「的相」这类），靠 BM25 的 idf 天然压低权重。
 *
 * 已知能力上限，必须说清楚：本方案不理解语义。「一个数的相反数是它本身，这个数是几」
 * 与「相反数的性质」能匹配，是因为字面重叠；而「互为倒数的两数之积为 1」与「倒数」
 * 匹配得上，与「乘法逆元」则完全匹配不上。这是纯字面检索的固有短板，
 * 由 §别名表 与 §术语抽取 两个机制部分弥补，而不是靠调参掩盖。
 */

/** 单次查询允许的最大长度。防长文本 DoS。 */
export const MAX_QUERY_LENGTH = 2000;

/** 单次查询生成的 term 数上限。 */
export const MAX_QUERY_TERMS = 512;

/**
 * 中文标点与空白，统一视为切分边界。
 * 刻意不把它们当字符参与 bigram：跨标点的 bigram（如「。相」）纯噪声。
 */
const BOUNDARY_RE =
  /[\s\u3000-\u303F\uFF00-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF65!-/:-@[-`{-~]+/;

/** CJK 统一表意文字（含扩展 A）与常用中文字符范围。 */
const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF]/;

function isCjk(ch) {
  return CJK_RE.test(ch);
}

// ---------------------------------------------------------------------------
// 归一
// ---------------------------------------------------------------------------

/** 全角 → 半角（数字、字母、常见符号）。 */
function toHalfWidth(s) {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code === 0x3000) out += " ";
    else if (code >= 0xff01 && code <= 0xff5e) out += String.fromCodePoint(code - 0xfee0);
    else out += ch;
  }
  return out;
}

/**
 * LaTeX 与数学符号归一。
 *
 * 目的：让「\frac{1}{2}」「½」「1/2」这类同义写法有机会命中同一个 term。
 * 只做保守的映射 —— 过度归一会把不同概念合并（如把上标统一丢弃会让 x² 与 x 无法区分）。
 */
const LATEX_MAP = new Map(
  Object.entries({
    "\\frac": "frac",
    "\\sqrt": "sqrt",
    "\\times": "times",
    "\\div": "div",
    "\\pm": "pm",
    "\\leq": "leq",
    "\\geq": "geq",
    "\\neq": "neq",
    "\\approx": "approx",
    "\\alpha": "alpha",
    "\\beta": "beta",
    "\\gamma": "gamma",
    "\\theta": "theta",
    "\\pi": "pi",
    "\\sum": "sum",
    "\\int": "int",
    "\\lim": "lim",
    "\\log": "log",
    "\\ln": "ln",
    "\\sin": "sin",
    "\\cos": "cos",
    "\\tan": "tan",
    "\\angle": "angle",
    "\\triangle": "triangle",
    "\\parallel": "parallel",
    "\\perp": "perp",
    "\\infty": "infty",
    "\\in": "in",
    "\\subset": "subset",
    "\\cup": "cup",
    "\\cap": "cap",
    "\\rightarrow": "to",
    "\\to": "to",
    "\\Delta": "delta",
    "\\delta": "delta",
    "\\lambda": "lambda",
    "\\mu": "mu",
    "\\omega": "omega",
    "\\rho": "rho",
    "\\sigma": "sigma",
    "\\phi": "phi",
  })
);

/** 单字符数学符号 → 文本 token。 */
const SYMBOL_MAP = new Map(
  Object.entries({
    "×": "times",
    "÷": "div",
    "±": "pm",
    "≤": "leq",
    "≥": "geq",
    "≠": "neq",
    "≈": "approx",
    "∈": "in",
    "⊂": "subset",
    "∪": "cup",
    "∩": "cap",
    "∞": "infty",
    "√": "sqrt",
    "∑": "sum",
    "∫": "int",
    "∠": "angle",
    "△": "triangle",
    "∥": "parallel",
    "⊥": "perp",
    "π": "pi",
    "α": "alpha",
    "β": "beta",
    "γ": "gamma",
    "θ": "theta",
    "λ": "lambda",
    "μ": "mu",
    "ω": "omega",
    "ρ": "rho",
    "σ": "sigma",
    "φ": "phi",
    "°": "deg",
    "′": "prime",
    "²": "sup2",
    "³": "sup3",
  })
);

/**
 * 文本归一。所有进入索引与查询的文本都必须先过这一步，
 * 否则索引侧与查询侧的归一不一致会导致召回静默丢失。
 * @param {string} text
 */
export function normalize(text) {
  if (typeof text !== "string") return "";
  let s = toHalfWidth(text);

  // LaTeX 命令：先长后短，避免 \int 抢掉 \infty 的前缀
  const cmds = [...LATEX_MAP.keys()].sort((a, b) => b.length - a.length);
  for (const cmd of cmds) {
    if (s.includes(cmd)) s = s.split(cmd).join(` ${LATEX_MAP.get(cmd)} `);
  }
  // 残留的 LaTeX 结构字符
  s = s.replace(/[{}$\\^_]+/g, " ");

  // 单字符符号
  let out = "";
  for (const ch of s) {
    out += SYMBOL_MAP.has(ch) ? ` ${SYMBOL_MAP.get(ch)} ` : ch;
  }

  return out.toLowerCase().replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// 切分
// ---------------------------------------------------------------------------

/**
 * 切成「块」：连续 CJK 段、连续英数段。标点与空白作边界丢弃。
 * @param {string} normalized 已归一的文本
 * @returns {Array<{ text: string, kind: "cjk"|"alnum" }>}
 */
export function chunk(normalized) {
  /** @type {Array<{text:string, kind:"cjk"|"alnum"}>} */
  const chunks = [];
  let buf = "";
  /** @type {"cjk"|"alnum"|null} */
  let kind = null;

  const flush = () => {
    if (buf && kind) chunks.push({ text: buf, kind });
    buf = "";
    kind = null;
  };

  for (const ch of normalized) {
    if (BOUNDARY_RE.test(ch)) {
      flush();
      continue;
    }
    const k = isCjk(ch) ? "cjk" : /[a-z0-9]/.test(ch) ? "alnum" : null;
    if (k === null) {
      flush();
      continue;
    }
    if (k !== kind) {
      flush();
      kind = k;
    }
    buf += ch;
  }
  flush();
  return chunks;
}

/**
 * 生成 term 列表。
 *
 * - CJK 块：bigram；单字块保留为 unigram（否则「点」「线」这类单字知识点无法被索引）
 * - 英数块：整块作为一个 term（不切 bigram —— 「newton」切成 ne/ew/wt 只会制造噪声）
 *
 * @param {string} text
 * @param {{ maxTerms?: number }} [opts]
 * @returns {string[]} 可含重复，重复即词频
 */
export function tokenize(text, opts = {}) {
  const maxTerms = opts.maxTerms ?? MAX_QUERY_TERMS;
  const normalized = normalize(text);
  /** @type {string[]} */
  const terms = [];

  for (const c of chunk(normalized)) {
    if (terms.length >= maxTerms) break;
    if (c.kind === "alnum") {
      terms.push(c.text);
      continue;
    }
    const chars = [...c.text];
    if (chars.length === 1) {
      terms.push(chars[0]);
      continue;
    }
    for (let i = 0; i + 1 < chars.length; i++) {
      if (terms.length >= maxTerms) break;
      terms.push(chars[i] + chars[i + 1]);
    }
  }
  return terms.slice(0, maxTerms);
}

/**
 * 词频表。
 * @param {string} text
 * @param {{ maxTerms?: number }} [opts]
 * @returns {Map<string, number>}
 */
export function termFreq(text, opts = {}) {
  const tf = new Map();
  for (const t of tokenize(text, opts)) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

// ---------------------------------------------------------------------------
// 别名最长匹配（长 query 的主通道）
// ---------------------------------------------------------------------------

/**
 * 别名词典。用于在长文本（一整道题）里扫出术语。
 *
 * 为什么长 query 必须走这条通道：对一整道题做 bigram 会产生几百个 term，
 * 其中绝大多数是题目情境的噪声（「小明」「一共」「多少」），
 * 真正指示知识点的那几个术语会被彻底淹没 —— 这是纯字面检索最主要的失败模式。
 * 先用别名词典把术语抽出来，再只对术语打分，可以绕过这个问题。
 */
export class AliasDict {
  constructor() {
    /** @type {Map<string, Set<string>>} 归一后的别名 → key 集合 */
    this.byAlias = new Map();
    /** @type {number} */
    this.maxAliasChars = 0;
    /** @type {Set<string>} 所有别名首字符，用于快速跳过不可能的起点 */
    this.firstChars = new Set();
  }

  /**
   * @param {string} alias
   * @param {string} key
   */
  add(alias, key) {
    const n = normalize(alias).replace(/\s+/g, "");
    if (!n) return;
    if (!this.byAlias.has(n)) this.byAlias.set(n, new Set());
    this.byAlias.get(n).add(key);
    const len = [...n].length;
    if (len > this.maxAliasChars) this.maxAliasChars = len;
    this.firstChars.add([...n][0]);
  }

  get size() {
    return this.byAlias.size;
  }

  /**
   * 在文本中做最长优先匹配，抽取命中的别名。
   *
   * 复杂度 O(文本长度 × 最长别名长度)。最长别名受 KP 名称长度约束（≤60 字符），
   * 2000 字符 query 的最坏情况约 12 万次 Map 查询，实测远低于毫秒级预算。
   *
   * @param {string} text
   * @returns {Array<{ alias: string, keys: string[], start: number, length: number }>}
   */
  extract(text) {
    const n = normalize(text).replace(/\s+/g, "");
    const chars = [...n];
    /** @type {Array<{alias:string, keys:string[], start:number, length:number}>} */
    const hits = [];
    let i = 0;

    while (i < chars.length) {
      if (!this.firstChars.has(chars[i])) {
        i += 1;
        continue;
      }
      let matched = null;
      const maxLen = Math.min(this.maxAliasChars, chars.length - i);
      // 最长优先：先试最长，命中即停，避免「相反数」被「相反」抢走
      for (let len = maxLen; len >= 1; len--) {
        const cand = chars.slice(i, i + len).join("");
        const keys = this.byAlias.get(cand);
        if (keys) {
          matched = { alias: cand, keys: [...keys], start: i, length: len };
          break;
        }
      }
      if (matched) {
        hits.push(matched);
        i += matched.length; // 不重叠匹配，避免同一段文本被反复计数
      } else {
        i += 1;
      }
    }
    return hits;
  }
}

/**
 * 判断 query 是否应走「长文本术语抽取」通道。
 *
 * 阈值 24 个字符：知识点名称实测最长约 20 字符（如「二次函数的图象与性质」10 字），
 * 超过 24 字符基本可以断定不是在输入一个知识点名，而是在贴题目或句子。
 * @param {string} text
 */
export function isLongQuery(text) {
  return [...normalize(text)].length > 24;
}
