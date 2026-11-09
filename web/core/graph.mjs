/**
 * 有向依赖图。API 2（前 k / 后 k 跳）、学习路径规划、前置缺口诊断的公共基础。
 *
 * 三类边：
 *   PREREQUISITE  有向，from 是 to 的必需前置。构成 DAG，必须无环。
 *   REFINES       有向父子（子 → 父），来自知识点树结构。
 *   RELATED       无向同主题关联。
 *
 * 只有 PREREQUISITE 参与前后 k 跳遍历与拓扑排序 —— REFINES 是「是什么的一部分」，
 * RELATED 是「与什么有关」，都不是「学之前必须先学」，混进依赖链会让学习路径失去意义。
 *
 * 规模：约 5k 节点、2 万边，纯内存邻接表足够，无需图数据库。
 */

/** k（跳数）上限。防止 k 过大导致遍历整图。 */
export const MAX_HOPS = 12;

/** 每层返回节点数上限。 */
export const MAX_LAYER_LIMIT = 200;

/** 学习路径长度上限。 */
export const MAX_PATH_LENGTH = 500;

/**
 * 一次子树聚合允许纳入的后代节点数上限。
 *
 * 主题层聚合要先把整棵子树走一遍，子树规模由数据决定而不是由调用方决定，
 * 但仍然要有上限：将来某一版把一级主题下的节点堆到几千个时，
 * 一个 /api/kp/neighbors 请求就会变成一次全分片遍历。
 * 实测 v0.10.0 最大子树 277（english.senior.language-knowledge）、p99 只有 40，
 * 500 留了足够余量，同时把最坏情况钉死在一个常数上。
 * 触到上限时必须**如实回报**（seeds_truncated），而不是悄悄给一个少了几条边的答案。
 */
export const MAX_SUBTREE_SEEDS = 500;

export class DependencyGraph {
  constructor() {
    /** @type {Map<string, {key:string, name?:string, node_kind?:string}>} */
    this.nodes = new Map();
    /** @type {Map<string, Array<{to:string, confidence:number, rationale?:string, source_signal?:string[]}>>} 前置 → 后继 */
    this.successors = new Map();
    /** @type {Map<string, Array<{to:string, confidence:number, rationale?:string, source_signal?:string[]}>>} 后继 → 前置 */
    this.prerequisites = new Map();
    /** @type {Map<string, string>} 子 → 父（REFINES） */
    this.parent = new Map();
    /** @type {Map<string, string[]>} 父 → 子 */
    this.children = new Map();
    /** @type {Map<string, Set<string>>} RELATED 无向邻接 */
    this.related = new Map();
    /**
     * 同一 (from, to) 被重复加过几次。**只记重复，不记首次**（值恒 >= 2）。
     *
     * 为什么图侧要记这件事而不是让调用方各自去查：`addPrerequisite` 原先无条件 push，
     * 同一对端点加两次就在邻接表里躺两份。这在数据里看起来完全正常（两条边的
     * from/to/confidence 都一样，只有 rationale 措辞不同），但下游全都被算错了：
     *   - manifest 的 prerequisite_edges 把同一条依赖数两遍，对外的边数虚高
     *   - traverseFrom 的 limit 是「每层最多几个节点」，重复边会占掉同一个 to 两次的
     *     遍历预算（虽然 `next` 是 Map 去重，最终不会重复返回，但白算一遍）
     *   - 传递归约里的 `for (const e2 of edges)` 会拿一条边和它自己的副本比，
     *     `e2.to === e.to` 那句 continue 恰好挡住了，但这是巧合而非设计
     * 记在图上，validateGraph 就能把它报成一条规则，12 出包时必然可见。
     * @type {Map<string, number>} `${from}\u0000${to}` → 出现次数
     */
    this.duplicatePrerequisites = new Map();
    /** @type {Set<string>} 已见过的 `${from}\u0000${to}`，重复判定用 */
    this._prereqSeen = new Set();
  }

  /** @param {{key:string, name?:string}} node */
  addNode(node) {
    if (!this.nodes.has(node.key)) this.nodes.set(node.key, node);
    return this;
  }

  /**
   * 加先修边。from 是 to 的前置。
   *
   * 重复的 (from, to) **仍然只入图一次**，第二次起只累加 duplicatePrerequisites 计数。
   * 不抛错是刻意的：重复边不像自环那样自相矛盾，它只是同一个事实被说了两遍，
   * 抛错会让一份仅有此瑕疵的历史数据包完全无法载入（服务端 graphFor 也走这条路径）。
   * 但也绝不静默：计数留在图上，由 validateGraph 报成 `graph.duplicate_prerequisite`。
   *
   * @param {{from:string, to:string, confidence?:number, rationale?:string, source_signal?:string[]}} e
   */
  addPrerequisite(e) {
    if (e.from === e.to) throw new Error(`先修边自环：${e.from}`);
    const id = prereqEdgeId(e.from, e.to);
    if (this._prereqSeen.has(id)) {
      this.duplicatePrerequisites.set(id, (this.duplicatePrerequisites.get(id) ?? 1) + 1);
      return this;
    }
    this._prereqSeen.add(id);
    const rec = {
      confidence: e.confidence ?? 1,
      rationale: e.rationale,
      source_signal: e.source_signal,
    };
    push(this.successors, e.from, { to: e.to, ...rec });
    push(this.prerequisites, e.to, { to: e.from, ...rec });
    return this;
  }

  /** 加父子边（子 → 父）。 */
  addRefines(childKey, parentKey) {
    if (childKey === parentKey) throw new Error(`父子边自环：${childKey}`);
    const existing = this.parent.get(childKey);
    if (existing && existing !== parentKey) {
      // 知识点树必须是树而不是 DAG，多父会让「所属主题」这个概念失去唯一性
      throw new Error(`${childKey} 已有父节点 ${existing}，不能再指向 ${parentKey}`);
    }
    this.parent.set(childKey, parentKey);
    if (!this.children.has(parentKey)) this.children.set(parentKey, []);
    if (!this.children.get(parentKey).includes(childKey)) {
      this.children.get(parentKey).push(childKey);
    }
    return this;
  }

  /** 加无向关联边。存储时不区分方向。 */
  addRelated(a, b) {
    if (a === b) throw new Error(`关联边自环：${a}`);
    if (!this.related.has(a)) this.related.set(a, new Set());
    if (!this.related.has(b)) this.related.set(b, new Set());
    this.related.get(a).add(b);
    this.related.get(b).add(a);
    return this;
  }

  get nodeCount() {
    return this.nodes.size;
  }

  get prerequisiteEdgeCount() {
    let n = 0;
    for (const list of this.successors.values()) n += list.length;
    return n;
  }

  // -------------------------------------------------------------------------
  // API 2：前 k / 后 k 跳
  // -------------------------------------------------------------------------

  /**
   * 按跳数分层的 BFS。
   *
   * k 的语义是**跳数**而非节点个数 —— 用户表述里「k 近邻」有歧义，
   * 但既然要的是「依赖链」，跳数才是有意义的度量：第 1 跳是直接前置，
   * 第 2 跳是前置的前置。响应中显式声明 k_semantics 避免调用方误解。
   *
   * @param {string} startKey
   * @param {"prerequisites"|"successors"} direction
   * @param {{ k?: number, limit?: number, minConfidence?: number }} [opts]
   * @returns {Array<{depth:number, total:number, returned:number, truncated:boolean, nodes:Array<{key:string, name?:string, confidence:number, via:string[]}>}>}
   */
  traverse(startKey, direction, opts = {}) {
    return this.traverseFrom([startKey], direction, opts);
  }

  /**
   * 多起点版的分层 BFS。`traverse` 是它的单起点特例。
   *
   * ## 为什么需要多起点
   *
   * 先修边的两端只能是 `node_kind=knowledge_point`（07-build-prereq-graph 的约束），
   * 主题层节点自身**永远没有 PREREQUISITE 边**。v0.10.0 把树物化成真节点之后，
   * 用户在树上点任何一个主题层都会看到空的依赖图 —— 而它辖下的叶子明明有边。
   * 「这个主题依赖什么」的正确答案是「它辖下叶子依赖什么」，那是一次以整批叶子
   * 为起点的 BFS，不是以主题为起点的 BFS（后者一步都走不出去）。
   *
   * ## 起点集整体算第 0 跳
   *
   * 于是「第 1 跳」= 从**任意**一个叶子出发一步能到的、且不在起点集内的节点。
   * 这与叶子自己查 neighbors 的第 1 跳语义一致（都是「一条真实边之外」），
   * 差别只在起点是一个还是一批。把起点集整体当第 0 跳而不是逐叶子各算一遍，
   * 是因为后者会让同一个外部节点按不同叶子重复出现在不同深度上 ——
   * 「这个主题的第 1 跳前置」就没有唯一答案了。
   *
   * ## 起点集全部预置进 visited
   *
   * 同一主题内部的边（`set-membership → intersection`，两端都在起点集里）因此
   * **不会**出现在结果里。这是对的：它们回答的是「这个主题内部的学习顺序」，
   * 而不是「这个主题依赖它之外的什么」。两者混在一起会让第 1 跳里既有外部依赖
   * 又有兄弟叶子，用户无从分辨哪些是「学这个主题前要先会的」。内部边由调用方
   * 单独统计并单独呈现（见 neighbors 路由的 internal_edges）。
   *
   * via 链的首项是**具体哪个叶子**（不是主题 key）：这条链是给「点开看为什么」用的，
   * 指向一个不存在这条边的主题节点等于把溯源掐断。
   *
   * @param {string[]} startKeys 起点集合（主题层聚合时是它辖下的全部叶子）
   * @param {"prerequisites"|"successors"} direction
   * @param {{ k?: number, limit?: number, minConfidence?: number }} [opts]
   * @returns {Array<{depth:number, total:number, returned:number, truncated:boolean, nodes:Array<{key:string, name?:string, confidence:number, via:string[]}>}>}
   */
  traverseFrom(startKeys, direction, opts = {}) {
    const k = clamp(opts.k ?? 2, 1, MAX_HOPS);
    const limit = clamp(opts.limit ?? 50, 1, MAX_LAYER_LIMIT);
    const minConf = opts.minConfidence ?? 0;
    const adj = direction === "prerequisites" ? this.prerequisites : this.successors;

    const seeds = [...new Set(Array.isArray(startKeys) ? startKeys : [startKeys])];

    /** @type {Array<{depth:number, nodes:any[]}>} */
    const layers = [];
    const visited = new Set(seeds);
    /** @type {Array<{key:string, via:string[], confidence:number}>} */
    let frontier = seeds.map((key) => ({ key, via: [], confidence: 1 }));

    for (let depth = 1; depth <= k; depth++) {
      /** @type {Map<string, {key:string, name?:string, confidence:number, via:string[]}>} */
      const next = new Map();

      for (const cur of frontier) {
        for (const edge of adj.get(cur.key) ?? []) {
          if (edge.confidence < minConf) continue;
          if (visited.has(edge.to)) continue;

          // 沿链传播置信度：多跳推断的可信度必然低于单跳，
          // 若不衰减，第 5 跳的节点会和直接前置一样可信，学习路径就会给出荒唐的建议
          const conf = cur.confidence * edge.confidence;
          const via = [...cur.via, cur.key];

          const prev = next.get(edge.to);
          if (!prev || conf > prev.confidence) {
            next.set(edge.to, {
              key: edge.to,
              name: this.nodes.get(edge.to)?.name,
              confidence: round4(conf),
              via,
            });
          }
        }
      }

      if (next.size === 0) break;

      const ranked = [...next.values()].sort((a, b) => b.confidence - a.confidence || cmp(a.key, b.key));
      const nodes = ranked.slice(0, limit);

      // visited 标记全部候选而非仅返回的那批：否则被 limit 截掉的节点会在下一层重复出现
      for (const key of next.keys()) visited.add(key);

      // **每层都要如实说这一层被截了没有。**
      //
      // 原先每层只给 `{ depth, nodes }`，于是一个 23 个后继的节点在默认 limit=20 下
      // 静默返回 20 个，而响应里**没有任何字段**能让调用方看出少了 3 个 ——
      // 没有 total、没有 truncated、没有 returned。实测全部 24 个分区里
      // 2/4163 个知识点遍历与 8/1137 个主题聚合会触到默认上限（最大一层 31 个）。
      //
      // 而同一个仓的 /api/search 与 /api/diagnose 对同一种截断都给了 total + truncated
      // （`/api/search?q=运动&limit=1` 返回 `total:468 returned:1 truncated:true`）。
      // neighbors 是唯一没给的那个兄弟。
      //
      // 后果比一般截断更重：被截掉的节点也进了 visited（上一行，刻意如此），
      // 所以第 1 层截断会连带删掉它们在**更深各层**的全部后代 ——
      // 实测一个 k=3 的查询在 limit=20 下总共只拿到 20 个节点，limit=200 下是 31 个。
      layers.push({
        depth,
        total: ranked.length,
        returned: nodes.length,
        truncated: ranked.length > nodes.length,
        nodes,
      });
      frontier = nodes.map((n) => ({ key: n.key, via: n.via, confidence: n.confidence }));
    }

    return layers;
  }

  /** API 2 的完整响应体。 */
  neighbors(startKey, opts = {}) {
    const prerequisites = this.traverse(startKey, "prerequisites", opts);
    const successors = this.traverse(startKey, "successors", opts);
    return {
      key: startKey,
      k: clamp(opts.k ?? 2, 1, MAX_HOPS),
      k_semantics: "hops",
      limit_per_layer: clamp(opts.limit ?? 50, 1, MAX_LAYER_LIMIT),
      // 顶层汇总一次：逐层的 truncated 已经在每层里了，但要求调用方遍历所有层
      // 才能回答「这份结果完整吗」，等于把那个判断留给它去做 —— 而多数调用方不会做。
      // 与 /api/changes 的 `truncated` 同一条取向：一个「成功」的响应必须自己说清
      // 它是不是完整的
      truncated: [...prerequisites, ...successors].some((l) => l.truncated),
      prerequisites,
      successors,
    };
  }

  // -------------------------------------------------------------------------
  // 主题层聚合：把「这个主题依赖什么」还原成「它辖下叶子依赖什么」
  // -------------------------------------------------------------------------

  /**
   * 沿 REFINES 收集一个节点的整棵后代子树。
   *
   * **沿 REFINES 边走，不按 key 前缀切。** 两者在 v0.10.0 恰好一致（实测 6386 个节点
   * 里 REFINES 父与「最近的存在前缀祖先」零分歧），但一致是数据当前的性质而不是约定：
   * key 是治理对象（可以有别名与迁移），REFINES 才是「谁是谁的一部分」的事实来源。
   * 按前缀切还会在别名 key 上悄悄给出错误的子树。
   *
   * 返回值把叶子（可教可考的知识点）与主题层分开：只有叶子能作先修边的端点，
   * 因此只有叶子该进 BFS 的起点集；而主题层要留在 `inside` 里，
   * 供调用方判断一条边的另一端是否仍落在本子树内。
   *
   * @param {string} rootKey
   * @param {{ maxNodes?: number }} [opts]
   * @returns {{ inside: Set<string>, leaves: string[], truncated: boolean }}
   *          inside 含 rootKey 自身；leaves 按 key 字典序（保证响应可复现）
   */
  collectSubtree(rootKey, opts = {}) {
    const maxNodes = clamp(opts.maxNodes ?? MAX_SUBTREE_SEEDS, 1, 100000);
    const inside = new Set([rootKey]);
    /** @type {string[]} */
    const leaves = [];
    let truncated = false;

    // 广度优先而不是深度优先：触到 maxNodes 时截掉的是**最深的那几层**而不是
    // 「后几个分支整支消失」—— 前者丢的是细节，后者丢的是一整块内容
    let frontier = [rootKey];
    while (frontier.length > 0) {
      /** @type {string[]} */
      const next = [];
      for (const cur of frontier) {
        for (const child of this.children.get(cur) ?? []) {
          if (inside.has(child)) continue;
          if (inside.size >= maxNodes) {
            truncated = true;
            continue;
          }
          inside.add(child);
          next.push(child);
        }
      }
      frontier = next;
    }

    for (const key of inside) {
      if (key === rootKey) continue;
      // 缺省即 knowledge_point：往版数据包没有 node_kind 字段，但里面每条都是知识点
      if (this.nodes.get(key)?.node_kind !== "topic") leaves.push(key);
    }
    leaves.sort(cmp);
    return { inside, leaves, truncated };
  }

  /**
   * 主题层的先修/后继聚合。
   *
   * 返回的分层结构与 `traverse` **逐字段同形**（depth / nodes / key / name / confidence / via），
   * 于是消费方（UI 的两张图、layeredDepLayout、collectPrereqPairs）不需要为聚合结果
   * 写第二套解析。差别只在语义，而语义由路由层用 `aggregated` 字段显式标出。
   *
   * 同时给出内部边（两端都在本子树内）。它对「这个主题依赖外部什么」没有信息量，
   * 但对「这个主题内部先学哪个」有 —— 实测全库有 2720 条这样的边，占先修边的 89%，
   * 悄悄丢掉它们会让用户以为主题内部没有任何学习顺序。
   *
   * @param {string} rootKey
   * @param {{ k?: number, limit?: number, maxSeeds?: number, maxInternal?: number }} [opts]
   */
  aggregateSubtreeNeighbors(rootKey, opts = {}) {
    const { inside, leaves, truncated } = this.collectSubtree(rootKey, { maxNodes: opts.maxSeeds });
    const maxInternal = clamp(opts.maxInternal ?? 200, 1, 2000);

    /** @type {Array<{from:string, to:string, confidence:number}>} */
    const internal = [];
    for (const key of leaves) {
      for (const e of this.successors.get(key) ?? []) {
        if (!inside.has(e.to)) continue;
        internal.push({ from: key, to: e.to, confidence: round4(e.confidence ?? 1) });
      }
    }
    const internalTotal = internal.length;
    // 先全量收齐再排序再截断。**顺序不能反**：边收一半就截会让「保留 confidence 最高的
    // 那些」变成「保留邻接表里最先出现的那些」，而后者取决于 edges.jsonl 的行序。
    // 全量是安全的 —— 起点集已被 maxSeeds 钉死，实测单个主题最多 136 条内部边。
    // 排序键带 key：同 confidence 的边若只按分数排，截断边界上的取舍就不确定，
    // 同一份数据两次请求会给出不同结果
    internal.sort((a, b) => b.confidence - a.confidence || cmp(a.from, b.from) || cmp(a.to, b.to));

    return {
      prerequisites: this.traverseFrom(leaves, "prerequisites", opts),
      successors: this.traverseFrom(leaves, "successors", opts),
      leaves,
      subtree_size: inside.size,
      seeds_truncated: truncated,
      internal_edges: internal.slice(0, maxInternal),
      internal_edge_total: internalTotal,
    };
  }

  // -------------------------------------------------------------------------
  // 环检测与传递归约
  // -------------------------------------------------------------------------

  /**
   * Tarjan 强连通分量。用于先修图的环检测。
   *
   * 迭代实现而非递归：5k 节点的深链会让递归爆栈，而爆栈的报错完全无法指向问题数据。
   *
   * @returns {string[][]} 大小 > 1 的强连通分量（即环）
   */
  findCycles() {
    let index = 0;
    const idx = new Map();
    const low = new Map();
    const onStack = new Set();
    /** @type {string[]} */
    const stack = [];
    /** @type {string[][]} */
    const sccs = [];

    const allNodes = new Set([...this.nodes.keys(), ...this.successors.keys(), ...this.prerequisites.keys()]);

    for (const root of allNodes) {
      if (idx.has(root)) continue;

      /** @type {Array<{node:string, edgeIdx:number}>} */
      const work = [{ node: root, edgeIdx: 0 }];
      idx.set(root, index);
      low.set(root, index);
      index += 1;
      stack.push(root);
      onStack.add(root);

      while (work.length > 0) {
        const frame = work[work.length - 1];
        const edges = this.successors.get(frame.node) ?? [];

        if (frame.edgeIdx < edges.length) {
          const w = edges[frame.edgeIdx].to;
          frame.edgeIdx += 1;
          if (!idx.has(w)) {
            idx.set(w, index);
            low.set(w, index);
            index += 1;
            stack.push(w);
            onStack.add(w);
            work.push({ node: w, edgeIdx: 0 });
          } else if (onStack.has(w)) {
            low.set(frame.node, Math.min(low.get(frame.node), idx.get(w)));
          }
        } else {
          work.pop();
          if (work.length > 0) {
            const parent = work[work.length - 1].node;
            low.set(parent, Math.min(low.get(parent), low.get(frame.node)));
          }
          if (low.get(frame.node) === idx.get(frame.node)) {
            const comp = [];
            let w;
            do {
              w = stack.pop();
              onStack.delete(w);
              comp.push(w);
            } while (w !== frame.node);
            if (comp.length > 1) sccs.push(comp.sort());
          }
        }
      }
    }
    return sccs;
  }

  /**
   * 找出一个具体的环路径，供报错时打印。
   * 只报「有环」对修数据毫无帮助，必须指出是哪几个节点首尾相接。
   * @param {string[]} scc
   * @returns {string[]}
   */
  cyclePathIn(scc) {
    const inScc = new Set(scc);
    const start = scc[0];
    /** @type {Map<string,string>} */
    const prev = new Map();
    const queue = [start];
    const seen = new Set([start]);

    while (queue.length > 0) {
      const cur = queue.shift();
      for (const e of this.successors.get(cur) ?? []) {
        if (!inScc.has(e.to)) continue;
        if (e.to === start) {
          const path = [start];
          let node = cur;
          while (node !== start) {
            path.unshift(node);
            node = prev.get(node);
          }
          path.unshift(start);
          return path;
        }
        if (!seen.has(e.to)) {
          seen.add(e.to);
          prev.set(e.to, cur);
          queue.push(e.to);
        }
      }
    }
    return scc;
  }

  /**
   * 传递归约：删除可由更长路径推出的直接边。
   *
   * 若 A→B、B→C、A→C 同时存在，A→C 是冗余的 —— 它不增加任何信息，
   * 却会让 API 2 的第 1 跳里混入本该在第 2 跳的节点，使分层失去意义。
   *
   * 前提是无环。有环时先修关系本身就是矛盾的，归约结果无意义，故直接抛错。
   *
   * @returns {{ removed: Array<{from:string,to:string}>, remaining: number }}
   */
  transitiveReduction() {
    const cycles = this.findCycles();
    if (cycles.length > 0) {
      throw new Error(
        `传递归约要求无环图，但检测到 ${cycles.length} 个环。请先修复环：${this.cyclePathIn(cycles[0]).join(" → ")}`
      );
    }

    const order = this.topoOrder();
    /** @type {Map<string, Set<string>>} 节点 → 可达集合 */
    const reach = new Map();
    /** @type {Array<{from:string,to:string}>} */
    const removed = [];

    // 逆拓扑序计算可达集合
    for (let i = order.length - 1; i >= 0; i--) {
      const node = order[i];
      const set = new Set();
      for (const e of this.successors.get(node) ?? []) {
        set.add(e.to);
        for (const r of reach.get(e.to) ?? []) set.add(r);
      }
      reach.set(node, set);
    }

    for (const node of order) {
      const edges = this.successors.get(node) ?? [];
      if (edges.length < 2) continue;
      const keep = [];
      for (const e of edges) {
        // 若存在另一条边 e2，使得从 e2.to 能到达 e.to，则 e 冗余
        let redundant = false;
        for (const e2 of edges) {
          if (e2.to === e.to) continue;
          if (reach.get(e2.to)?.has(e.to)) {
            redundant = true;
            break;
          }
        }
        if (redundant) removed.push({ from: node, to: e.to });
        else keep.push(e);
      }
      this.successors.set(node, keep);
    }

    // 同步重建反向邻接表
    this.prerequisites = new Map();
    for (const [from, edges] of this.successors) {
      for (const e of edges) {
        push(this.prerequisites, e.to, {
          to: from,
          confidence: e.confidence,
          rationale: e.rationale,
          source_signal: e.source_signal,
        });
      }
    }
    // 重复判定的已见集合也要跟着收缩。归约删掉的边已不在图里，
    // 若 _prereqSeen 还留着它们，此后再 addPrerequisite 同一对端点会被当成重复而静默丢弃
    // —— 那条边就再也加不回来了，而这里删边的理由（冗余）与「不许再加」毫无关系。
    //
    // ⚠ 分隔符**必须与 addPrerequisite 用的同一个**（`\u0000`，见 :87）。
    // 这里原先用的是空格，于是重建出来的集合与 addPrerequisite 算出的 id 永不相等，
    // 归约之后重复边检测整体失效：再加一条**已存在**的边不会被判重，
    // 图里就有了两条一模一样的边，而 `duplicatePrerequisites` 是空的。
    // 后果落在 validate.mjs:122 —— 它正是在归约后的克隆图上查重复边，
    // 于是 error 级规则 `graph.duplicate_prerequisite`（其注释说它防的是
    //「manifest 报错边数」）永远不可能触发。
    //
    // 原有用例只重加了**被删掉的**那条边（a→c），那条边在两种分隔符下都不在集合里，
    // 所以它恒绿；漏的是重加**存活边**这一半。这类「换个分隔符就静默失效」的错
    // 不会有任何报错，只会让一条检查安静地不再工作。
    this._prereqSeen = new Set();
    for (const [from, edges] of this.successors) for (const e of edges) this._prereqSeen.add(prereqEdgeId(from, e.to));

    return { removed, remaining: this.prerequisiteEdgeCount };
  }

  /**
   * 拓扑排序。同层按 key 字典序，保证输出稳定可复现。
   * @returns {string[]}
   */
  topoOrder() {
    const allNodes = new Set([...this.nodes.keys(), ...this.successors.keys(), ...this.prerequisites.keys()]);
    const indeg = new Map();
    for (const n of allNodes) indeg.set(n, 0);
    for (const [, edges] of this.successors) {
      for (const e of edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    }

    const ready = [...allNodes].filter((n) => (indeg.get(n) ?? 0) === 0).sort(cmp);
    /** @type {string[]} */
    const out = [];

    while (ready.length > 0) {
      const n = ready.shift();
      out.push(n);
      /** @type {string[]} */
      const newly = [];
      for (const e of this.successors.get(n) ?? []) {
        const d = (indeg.get(e.to) ?? 0) - 1;
        indeg.set(e.to, d);
        if (d === 0) newly.push(e.to);
      }
      if (newly.length > 0) {
        ready.push(...newly);
        ready.sort(cmp);
      }
    }

    if (out.length < allNodes.size) {
      const stuck = [...allNodes].filter((n) => !out.includes(n));
      throw new Error(
        `拓扑排序失败，${stuck.length} 个节点处于环中。示例：${stuck.slice(0, 5).join(", ")}`
      );
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // 学习路径与缺口诊断
  // -------------------------------------------------------------------------

  /**
   * 学习路径规划：给定目标与已掌握集合，输出需要学习的最短序列（拓扑序）。
   *
   * @param {string[]} targets 目标知识点
   * @param {string[]} [known] 已掌握的知识点
   * @param {{ maxLength?: number }} [opts]
   * @returns {{ sequence: Array<{key:string, name?:string, depth:number, reason:string}>, missing_targets: string[], skipped_known: string[] }}
   */
  learningPath(targets, known = [], opts = {}) {
    const maxLen = clamp(opts.maxLength ?? MAX_PATH_LENGTH, 1, MAX_PATH_LENGTH);
    const knownSet = new Set(known);
    const missingTargets = [];

    // 反向收集所有未掌握的前置。已掌握的节点直接剪枝 —— 不再深入它的前置，
    // 这是「已掌握」的应有语义：掌握了一个知识点就意味着它的前置也掌握了。
    const needed = new Set();
    /** @type {Map<string, number>} key → 距目标的最大深度 */
    const depth = new Map();
    /** @type {Map<string, string>} key → 被引入的原因 */
    const reason = new Map();

    for (const t of targets) {
      if (!this.nodes.has(t) && !this.prerequisites.has(t) && !this.successors.has(t)) {
        missingTargets.push(t);
        continue;
      }
      if (knownSet.has(t)) continue;

      const stack = [{ key: t, d: 0, why: "目标知识点" }];
      while (stack.length > 0) {
        const { key, d, why } = stack.pop();
        if (knownSet.has(key)) continue;
        if (d > MAX_HOPS * 4) continue; // 防御异常深链
        if (!needed.has(key)) {
          needed.add(key);
          reason.set(key, why);
        }
        depth.set(key, Math.max(depth.get(key) ?? 0, d));
        for (const e of this.prerequisites.get(key) ?? []) {
          if (knownSet.has(e.to)) continue;
          stack.push({ key: e.to, d: d + 1, why: `${key} 的前置` });
        }
      }
    }

    // 在 needed 子图上做拓扑排序，得到可行的学习顺序
    const sub = new DependencyGraph();
    for (const k of needed) sub.addNode(this.nodes.get(k) ?? { key: k });
    for (const k of needed) {
      for (const e of this.prerequisites.get(k) ?? []) {
        if (needed.has(e.to)) sub.addPrerequisite({ from: e.to, to: k, confidence: e.confidence });
      }
    }

    let order;
    try {
      order = sub.topoOrder();
    } catch (err) {
      throw new Error(`学习路径规划失败：${err.message}`);
    }

    const sequence = order.slice(0, maxLen).map((key) => ({
      key,
      name: this.nodes.get(key)?.name,
      depth: depth.get(key) ?? 0,
      reason: reason.get(key) ?? "前置依赖",
    }));

    return {
      sequence,
      // 切片**前**的长度。路由原先用 `sequence.length >= maxLength` 推断截断，
      // 那在「路径恰好等于 limit」时会误报 truncated=true —— 什么都没被切掉却
      // 警告要分页，于是这个标记不能再当判据用。差一个的方向是安全的（过报而非
      // 少报），但一个不可信的标记等于没有标记。
      total_length: order.length,
      missing_targets: missingTargets.sort(),
      skipped_known: [...knownSet].filter((k) => this.nodes.has(k)).sort(),
    };
  }

  /**
   * 前置缺口诊断：给一批做错的知识点，反推最可能缺失的前置。
   *
   * 打分逻辑：一个前置被越多错题知识点共同依赖，它越可能是真正的病根。
   * 这个假设在「错题集中在同一主题」时成立，在「错题分散」时会给出弱信号 —— 
   * 因此响应里带 support（被多少个错题知识点依赖），让调用方自己判断可信度，
   * 而不是给一个看起来很确定的单一答案。
   *
   * @param {string[]} wrongKeys
   * @param {{ k?: number, limit?: number }} [opts]
   * @returns {{ candidates: Array<{key:string, name?:string, score:number, support:number, supported_by:string[], min_depth:number}>, unknown_keys: string[] }}
   */
  diagnoseGaps(wrongKeys, opts = {}) {
    const k = clamp(opts.k ?? 3, 1, MAX_HOPS);
    const limit = clamp(opts.limit ?? 20, 1, MAX_LAYER_LIMIT);

    const unknown = [];
    /** @type {Map<string, {score:number, support:Set<string>, minDepth:number}>} */
    const acc = new Map();

    for (const wk of wrongKeys) {
      if (!this.nodes.has(wk) && !this.prerequisites.has(wk)) {
        unknown.push(wk);
        continue;
      }
      const layers = this.traverse(wk, "prerequisites", { k, limit: MAX_LAYER_LIMIT });
      for (const layer of layers) {
        for (const node of layer.nodes) {
          let e = acc.get(node.key);
          if (!e) {
            e = { score: 0, support: new Set(), minDepth: Infinity };
            acc.set(node.key, e);
          }
          // 距离越近权重越高：直接前置比五跳之外的远祖更可能是病根
          e.score += node.confidence / layer.depth;
          e.support.add(wk);
          e.minDepth = Math.min(e.minDepth, layer.depth);
        }
      }
    }

    const ranked = [...acc.entries()]
      .map(([key, e]) => ({
        key,
        name: this.nodes.get(key)?.name,
        // 被多个错题共同依赖时给额外加权，这是「共同病根」的信号
        score: round4(e.score * Math.log2(1 + e.support.size)),
        support: e.support.size,
        supported_by: [...e.support].sort(),
        min_depth: e.minDepth,
      }))
      .sort((a, b) => b.score - a.score || a.min_depth - b.min_depth || cmp(a.key, b.key));

    // 切片**前**的总数一并返回。只给切片后的长度，调用方会把 limit 当成
    // 「候选就这么多」—— security.mjs 点名要防的正是这类静默截断
    //（「请求 limit=10000 却拿到 200 条，会以为数据只有 200 条」），
    // 而一个恒 ≤ limit 的 total 就是它：默认 limit=20 时 30 个错题的诊断
    // 报 total=20，看起来像「病根找齐了」。
    return { candidates: ranked.slice(0, limit), total: ranked.length, unknown_keys: unknown.sort() };
  }

  /** 孤儿节点：既无前置也无后继，且无父子关系。可能是漏建边。 */
  findOrphans() {
    const orphans = [];
    for (const key of this.nodes.keys()) {
      const hasPrereq = (this.prerequisites.get(key) ?? []).length > 0;
      const hasSucc = (this.successors.get(key) ?? []).length > 0;
      const hasParent = this.parent.has(key);
      const hasChild = (this.children.get(key) ?? []).length > 0;
      if (!hasPrereq && !hasSucc && !hasParent && !hasChild) orphans.push(key);
    }
    return orphans.sort();
  }

  /** 悬挂边：边指向了不存在的节点。 */
  findDanglingEdges() {
    const dangling = [];
    for (const [from, edges] of this.successors) {
      if (!this.nodes.has(from)) dangling.push({ type: "PREREQUISITE", end: "from", key: from });
      for (const e of edges) {
        if (!this.nodes.has(e.to)) dangling.push({ type: "PREREQUISITE", end: "to", key: e.to, from });
      }
    }
    for (const [child, parent] of this.parent) {
      if (!this.nodes.has(child)) dangling.push({ type: "REFINES", end: "from", key: child });
      if (!this.nodes.has(parent)) dangling.push({ type: "REFINES", end: "to", key: parent, from: child });
    }
    return dangling;
  }
}

// ---------------------------------------------------------------------------

/**
 * 先修边的去重 id。**两个调用点必须共用这一个函数。**
 *
 * 曾经不是：addPrerequisite 用 `\u0000` 连接，而 transitiveReduction 重建
 * `_prereqSeen` 时用的是一个空格。两边算出的 id 永不相等，于是归约之后重复边
 * 检测整体失效 —— 再加一条**已存在**的边不会被判重，图里就有了两条一模一样的边，
 * 而 `duplicatePrerequisites` 是空的。后果落在 validate.mjs：它正是在归约后的
 * 克隆图上查重复边，于是 error 级规则 `graph.duplicate_prerequisite`
 *（其注释说它防的是「manifest 报错边数」）永远不可能触发。
 *
 * 用 `\u0000` 而不是空格或点号，是因为 key 里不可能出现 NUL 而可能出现点号；
 * 空格虽然也不会出现在 key 里，但两处写法必须一致才有意义 —— 而「必须一致」
 * 这件事只有抽成函数才是结构上成立的，写两遍就总有一天会漂。
 *
 * @param {string} from
 * @param {string} to
 */
function prereqEdgeId(from, to) {
  return `${from}\u0000${to}`;
}

function push(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function cmp(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}
