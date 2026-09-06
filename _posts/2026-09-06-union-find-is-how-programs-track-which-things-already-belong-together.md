---
title: "Union-Find is how programs track which things already belong together"
date: 2026-09-06 13:52:00 -0400
categories: [skills]
tags: [union-find, disjoint-set, minimum-spanning-tree, kruskals-algorithm, graphs, greedy-algorithms, algorithms, fundamentals, teaching-track]
summary: "Kruskal's algorithm builds a minimum spanning tree by greedily adding the cheapest edge that doesn't form a cycle, and answering 'would this edge form a cycle' fast enough to matter is exactly the problem a new structure, union-find, exists to solve."
---

Last time, Dijkstra's algorithm answered "what's the cheapest way from one node to another," and it left off pointing at a different question: not "cheapest path from a start," but "cheapest way to connect every node in a graph together at all." That's the **minimum spanning tree** problem — given a weighted, connected graph, pick a subset of edges that touches every node, contains no cycles, and has the lowest possible total edge weight. Think of it as the problem behind wiring a set of buildings with the least total cable, or connecting a set of cities with the least total road, when any building can reach any other through some chain of connections and you don't care how many hops it takes, only what the whole network costs to build.

Solving it needs a structure we haven't built yet, because the greedy approach that solves it runs into a question none of our existing tools answer efficiently: "if I add this edge, will it close a loop with edges I've already picked?"

## The greedy idea: cheapest edge first, skip the ones that'd close a loop

Kruskal's algorithm, like Dijkstra's, isn't a new kind of thinking — it's the greedy-choice pattern from a few lessons back, applied to edges instead of activities. Sort every edge in the graph by weight, cheapest first. Walk the sorted list, and for each edge, add it to your growing tree unless doing so would connect two nodes that are already connected through edges you've already picked. Stop once you've added enough edges to touch every node.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["A"] ---|"1"| B["B"]
    A ---|"4"| C["C"]
    B ---|"2"| C
    B ---|"5"| D["D"]
    C ---|"3"| D
  </div>
  <figcaption>Five edges connect four nodes. A spanning tree needs exactly three edges (one fewer than the node count) to touch all four without a cycle — the question is which three cost the least combined.</figcaption>
</figure>

Sorted by weight: `A-B` (1), `B-C` (2), `C-D` (3), `A-C` (4), `B-D` (5). Walk the list. Take `A-B` — nothing's connected yet, so no cycle risk. Take `B-C` — `A,B` and `C` aren't yet connected to each other, so this is safe, and now `A, B, C` are all joined. Now look at `C-D` — `D` isn't connected to anything yet, so take it too. All four nodes are now joined with three edges, total cost `1 + 2 + 3 = 6`, and we can stop — the two remaining edges, `A-C` and `B-D`, would each connect two nodes that are already connected through the edges we picked, so they'd only add a cycle, not new reach.

That check — "are these two nodes already connected through what I've picked so far" — is the entire difficulty in this algorithm. Sorting the edges is the sorting lesson. Picking greedily is the greedy lesson. But answering "already connected?" by re-running a graph traversal from scratch on every single edge would work, and would also be far slower than it needs to be, because the graph traversal lesson's tools weren't built to answer this question incrementally, edge by edge, as the picked set grows.

## The structure this needs: disjoint sets

What Kruskal's algorithm actually needs is a way to track groups of nodes that are known to be connected, and to ask "are these two nodes in the same group" and "merge these two groups" — both, ideally, fast. This is a **union-find** structure, also called a **disjoint-set** structure, and it does exactly two things:

- `find(x)` — return an identifier for the group `x` currently belongs to.
- `union(x, y)` — merge the groups containing `x` and `y` into one group.

Two nodes are "already connected" exactly when `find` returns the same group identifier for both. The structure that makes this fast is deceptively simple: every node points to a parent, initially itself, and a group's identifier is whichever node you reach by following parent pointers until you hit a node that points to itself — the group's **root**.

```c
struct DisjointSet {
    int *parent;
    int count;
};

struct DisjointSet *ds_create(int n) {
    struct DisjointSet *ds = malloc(sizeof(struct DisjointSet));
    ds->parent = malloc(n * sizeof(int));
    ds->count = n;
    for (int i = 0; i < n; i++) {
        ds->parent[i] = i;
    }
    return ds;
}

int find(struct DisjointSet *ds, int x) {
    while (ds->parent[x] != x) {
        x = ds->parent[x];
    }
    return x;
}

int is_connected(struct DisjointSet *ds, int x, int y) {
    return find(ds, x) == find(ds, y);
}

void set_union(struct DisjointSet *ds, int x, int y) {
    int root_x = find(ds, x);
    int root_y = find(ds, y);
    if (root_x != root_y) {
        ds->parent[root_x] = root_y;
    }
}
```

Every node starts as its own root — `n` isolated groups, matching the fact that no edges have been picked yet. `find` walks parent pointers to the root, which doubles as the group's name because it's stable until a `union` changes it. `set_union` doesn't merge every member of both groups one by one — it just points one root at the other, which instantly makes every node that used to trace to the first root now trace to the second, one hop later. That's the whole trick: groups merge in one pointer write, regardless of how many nodes are in either group.

## Tracing Kruskal's algorithm with it

Back to the four-node graph. Start with `ds_create(4)` — nodes `A, B, C, D` each their own root: `parent = [A, B, C, D]`.

Sorted edges: `A-B` (1), `B-C` (2), `C-D` (3), `A-C` (4), `B-D` (5).

**`A-B`, weight 1**: `find(A) = A`, `find(B) = B` — different roots, so no cycle. Take the edge, `set_union(A, B)` — say `A`'s root now points to `B`. `parent = [B, B, C, D]`.

**`B-C`, weight 2**: `find(B) = B`, `find(C) = C` — different roots. Take the edge, `set_union(B, C)` — `B`'s root points to `C`. `parent = [B, C, C, D]`. Notice `find(A)` now walks `A → B → C`, two hops, and correctly lands on `C` — `A` was never touched directly, but it's still discoverable as part of `C`'s group through the chain.

**`C-D`, weight 3**: `find(C) = C`, `find(D) = D` — different roots. Take the edge, `set_union(C, D)` — `C`'s root points to `D`. `parent = [B, C, D, D]`. Now every node traces to `D`: `A → B → C → D`.

**`A-C`, weight 4**: `find(A)` walks `A → B → C → D`, landing on `D`. `find(C)` walks `C → D`, also landing on `D`. Same root — this edge would connect two nodes already in the same group, so **skip it**. Taking it would only close a cycle.

**`B-D`, weight 5**: `find(B)` lands on `D`, `find(D)` is `D`. Same root again — **skip**.

Three edges taken (`A-B`, `B-C`, `C-D`), all four nodes in one group, total cost `6` — the minimum spanning tree, matching the answer we found by inspection earlier, except this time the "already connected?" check took one root lookup per side instead of a fresh traversal of everything picked so far.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Sort all edges by weight, ascending"] --> B["Take next cheapest edge"]
    B --> C{"find(u) == find(v)?"}
    C -- "Yes — same group already" --> D["Skip: would create a cycle"]
    C -- "No — different groups" --> E["Add edge to tree, union(u, v)"]
    D --> F{"More edges left?"}
    E --> F
    F -- "Yes" --> B
    F -- "No" --> G["Done: minimum spanning tree complete"]
  </div>
  <figcaption>Kruskal's algorithm is the greedy pattern — cheapest available choice, skip anything that violates a constraint — with union-find answering the constraint check in near-constant time per edge.</figcaption>
</figure>

## Why the naive check would have been worse

It's worth being explicit about what union-find bought us, because the payoff is easy to understate. Without it, "does adding this edge create a cycle" would mean: build the graph out of edges picked so far, and run a traversal (the graph traversal lesson's BFS or DFS) from one endpoint to see if it can reach the other. That works, but it re-derives connectivity from scratch on every single edge under consideration, walking however many nodes and edges are already in the tree each time.

Union-find instead maintains connectivity as running state, updated incrementally. Each `find` only walks a chain of parent pointers, and each `union` is a single pointer write. The chains can, in principle, get long if you're unlucky about which root absorbs which — a concern real implementations address with two refinements, *union by rank* (always attach the smaller group's root to the larger group's, keeping chains shorter) and *path compression* (while walking to a root in `find`, point every node along the way directly at that root, flattening future lookups). Both are extensions of the same idea shown here, not different ideas — they keep `find` and `union` fast as the structure scales, the same way a balanced tree keeps lookups fast as a plain binary search tree scales.

## What carried forward

Nothing about Kruskal's algorithm required inventing a new way to think. It's the greedy-choice lesson — take the cheapest option, skip what violates the constraint — applied to edges instead of intervals, exactly like Dijkstra's algorithm was breadth-first search with one substitution. What's genuinely new is the disjoint-set structure itself: a purpose-built answer to "are these two things already in the same group," which none of the earlier structures — not the hash table, not the graph traversal, not the priority queue — were shaped to answer efficiently as a running, updatable fact.

Next time, we'll look at what happens when a problem's greedy choice isn't safe — when picking the locally best option at each step can lock you into a worse total answer than a choice that looked wasteful at the time — which is the boundary between greedy algorithms and the dynamic-programming lesson from a few tracks back, and why telling the two apart before you start coding is the actual skill.
