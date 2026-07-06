// KnowledgeGraph.js - 完整前端知识图谱引擎
// 来源：6号（Grok）任务输出
// 日期：2026-07-06

class KnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.nodeByType = new Map();
    this.edgeByType = new Map();
    this.propertyIndex = new Map();
    this.fullTextIndex = new Map();
    this.outgoing = new Map();
    this.incoming = new Map();
    this.version = 1;
    this.lastUpdated = Date.now();
  }

  addNode(nodeData) {
    const node = {
      id: nodeData.id || this.generateId(),
      type: nodeData.type,
      label: nodeData.label,
      properties: nodeData.properties || {},
      metadata: {
        created: Date.now(),
        updated: Date.now(),
        version: 1,
        source: nodeData.source || "manual"
      }
    };

    this.nodes.set(node.id, node);
    
    if (!this.nodeByType.has(node.type)) {
      this.nodeByType.set(node.type, new Set());
    }
    this.nodeByType.get(node.type).add(node.id);

    this._indexProperties(node);
    this._indexFullText(node);

    return node.id;
  }

  addEdge(edgeData) {
    const edge = {
      id: edgeData.id || this.generateId(),
      source: edgeData.source,
      target: edgeData.target,
      relationType: edgeData.relationType,
      properties: edgeData.properties || {},
      weight: edgeData.weight || 1,
      bidirectional: edgeData.bidirectional || false
    };

    this.edges.set(edge.id, edge);

    if (!this.outgoing.has(edge.source)) {
      this.outgoing.set(edge.source, new Set());
    }
    this.outgoing.get(edge.source).add(edge.id);

    if (!this.incoming.has(edge.target)) {
      this.incoming.set(edge.target, new Set());
    }
    this.incoming.get(edge.target).add(edge.id);

    if (!this.edgeByType.has(edge.relationType)) {
      this.edgeByType.set(edge.relationType, new Set());
    }
    this.edgeByType.get(edge.relationType).add(edge.id);

    return edge.id;
  }

  queryNodes(filters = {}, limit = 50, offset = 0) {
    let results = Array.from(this.nodes.values());

    if (filters.type) {
      results = results.filter(n => n.type === filters.type);
    }

    if (filters.properties) {
      results = results.filter(n => {
        return Object.entries(filters.properties).every(([key, value]) => 
          n.properties[key] === value
        );
      });
    }

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      results = results.filter(n => 
        n.label.toLowerCase().includes(keyword) ||
        JSON.stringify(n.properties).toLowerCase().includes(keyword)
      );
    }

    return results.slice(offset, offset + limit);
  }

  traverse(startId, relationTypes = [], direction = "outgoing", maxDepth = 3) {
    const visited = new Set();
    const results = [];
    const queue = [{ id: startId, depth: 0, path: [startId] }];

    while (queue.length > 0) {
      const { id, depth, path } = queue.shift();
      if (depth > maxDepth || visited.has(id)) continue;
      visited.add(id);

      const edgeIds = direction === "outgoing" 
        ? (this.outgoing.get(id) || new Set())
        : (this.incoming.get(id) || new Set());

      for (const edgeId of edgeIds) {
        const edge = this.edges.get(edgeId);
        if (!relationTypes.length || relationTypes.includes(edge.relationType)) {
          const nextId = direction === "outgoing" ? edge.target : edge.source;
          results.push({
            node: this.nodes.get(nextId),
            edge: edge,
            path: [...path, nextId]
          });
          queue.push({ id: nextId, depth: depth + 1, path: [...path, nextId] });
        }
      }
    }
    return results;
  }

  recommend(basedOnNodeId, limit = 5) {
    const startNode = this.nodes.get(basedOnNodeId);
    if (!startNode) return [];

    const candidates = [];
    const related = this.traverse(basedOnNodeId, ["similar_to", "requires", "cooperates_with"], "outgoing", 2);
    
    related.forEach(item => {
      if (item.node.type === startNode.type) {
        candidates.push({
          node: item.node,
          score: item.edge.weight || 1,
          reason: `与 ${startNode.label} ${item.edge.relationType}`
        });
      }
    });

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async saveToIndexedDB() {
    const db = await this._openDB();
    const tx = db.transaction(["nodes", "edges", "meta"], "readwrite");
    
    for (const [id, node] of this.nodes) {
      await tx.objectStore("nodes").put(node);
    }
    for (const [id, edge] of this.edges) {
      await tx.objectStore("edges").put(edge);
    }
    
    await tx.objectStore("meta").put({
      key: "lastUpdated",
      value: Date.now()
    });
  }

  async loadFromIndexedDB() {
    const db = await this._openDB();
    const nodes = await db.transaction("nodes").objectStore("nodes").getAll();
    const edges = await db.transaction("edges").objectStore("edges").getAll();

    nodes.forEach(n => this.nodes.set(n.id, n));
    edges.forEach(e => this.edges.set(e.id, e));
    
    this._rebuildIndexes();
  }

  _indexProperties(node) {
    Object.keys(node.properties).forEach(key => {
      if (!this.propertyIndex.has(key)) {
        this.propertyIndex.set(key, new Map());
      }
      const valueMap = this.propertyIndex.get(key);
      const value = node.properties[key];
      if (!valueMap.has(value)) valueMap.set(value, new Set());
      valueMap.get(value).add(node.id);
    });
  }

  _indexFullText(node) {
    const text = `${node.label} ${JSON.stringify(node.properties)}`.toLowerCase();
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (word.length > 1) {
        if (!this.fullTextIndex.has(word)) this.fullTextIndex.set(word, new Set());
        this.fullTextIndex.get(word).add(node.id);
      }
    });
  }

  generateId() {
    return "node_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  _rebuildIndexes() {
    this.nodeByType.clear();
    this.propertyIndex.clear();
    this.fullTextIndex.clear();
    this.outgoing.clear();
    this.incoming.clear();
    
    for (const [id, node] of this.nodes) {
      if (!this.nodeByType.has(node.type)) this.nodeByType.set(node.type, new Set());
      this.nodeByType.get(node.type).add(id);
      this._indexProperties(node);
      this._indexFullText(node);
    }

    for (const [id, edge] of this.edges) {
      if (!this.outgoing.has(edge.source)) this.outgoing.set(edge.source, new Set());
      this.outgoing.get(edge.source).add(edge.id);
      if (!this.incoming.has(edge.target)) this.incoming.set(edge.target, new Set());
      this.incoming.get(edge.target).add(edge.id);
    }
  }

  async _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("CNC_KnowledgeGraph", 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("nodes")) {
          db.createObjectStore("nodes", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("edges")) {
          db.createObjectStore("edges", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

if (typeof window !== "undefined") {
  window.CNC_KnowledgeGraph = KnowledgeGraph;
  console.log("[知识图谱引擎] 已加载");
}
