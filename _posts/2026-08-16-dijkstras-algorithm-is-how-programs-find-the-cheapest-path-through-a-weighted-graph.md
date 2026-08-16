---
title: "Dijkstra's algorithm is how programs find the cheapest path through a weighted graph"
date: 2026-08-16 14:12:00 -0400
categories: [skills]
tags: [graphs, dijkstras-algorithm, priority-queues, shortest-path, algorithms, fundamentals, teaching-track]
summary: "Dijkstra's algorithm answers the question breadth-first search can't: when edges have different costs, the shortest path by hop count and the cheapest path by total cost are not the same path, and finding the cheap one means letting a priority queue decide what 'closest' actually means."
---

Last time, we watched breadth-first search find the shortest path through a graph by visiting nodes in strict order of distance from the start, one layer at a time. That guarantee — the first time BFS reaches a node is via a shortest path to it — depends on a fact we didn't dwell on: every edge in that graph counted for exactly one step. Hop count and distance were the same number.

Most graphs that matter don't work that way. A road network has edges that take different amounts of time to cross depending on distance and traffic. A service dependency graph has calls that cost different amounts of latency. A currency exchange graph has edges that multiply money by different rates. In every one of these, the path with the fewest edges and the path with the lowest total cost can be different paths entirely — a two-hop route across a toll highway can cost more than a five-hop route through side streets.

BFS has no way to notice this, because BFS's queue treats every discovered node as equally close the moment it's discovered. What we need is a traversal that keeps asking "of everything I've found so far, which one is *actually* cheapest to reach" — and we already built the exact structure that answers that question, several lessons ago.

## The graph, now with weights

Take a graph close to the one from the traversal lesson, but give each edge a cost instead of treating them as identical:

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["A"] -->|"4"| B["B"]
    A -->|"1"| C["C"]
    C -->|"2"| B
    B -->|"1"| D["D"]
    C -->|"6"| D
  </div>
  <figcaption>Two ways from A to D: direct-looking A→B→D costs 4 + 1 = 5. The less obvious A→C→B→D costs 1 + 2 + 1 = 4 — cheaper, despite being one edge longer.</figcaption>
</figure>

BFS, counting hops, would report `A → B → D` as tied for shortest with any other two-hop route, and would have no opinion about `A → C → B → D` being one hop longer — it doesn't track cost at all, only distance-in-edges. But `A → C → B → D` costs 4, and `A → B → D` costs 5. The cheaper path is the longer one. Any algorithm that ignores weights will get this wrong exactly when it matters most.

## Reusing the priority queue, not reinventing traversal

Dijkstra's algorithm is not a new traversal strategy built from scratch. It's breadth-first search with one change: swap the plain queue — which hands you whatever was discovered longest ago — for the priority queue we covered a few lessons back, which hands you whatever currently looks cheapest to reach.

That single substitution changes what "visit next" means. BFS's frontier answers "what did we discover first?" Dijkstra's frontier answers "what can we reach most cheaply, given everything we know so far?" The second question is strictly more useful when edges aren't uniform, and it degrades gracefully into the first question when they are — which is why BFS is really just Dijkstra's algorithm on a graph where every edge happens to cost exactly 1.

```c
void dijkstra(struct Node *start, struct Node *target) {
    struct PriorityQueue *frontier = pq_create();
    struct Map *best_cost = map_create();

    map_set(best_cost, start, 0);
    pq_push(frontier, start, 0);

    while (!pq_empty(frontier)) {
        struct Node *current = pq_pop(frontier);
        int current_cost = map_get(best_cost, current);

        if (current == target) {
            printf("cheapest cost: %d\n", current_cost);
            return;
        }

        for (int i = 0; i < current->edge_count; i++) {
            struct Node *neighbor = current->edges[i].to;
            int edge_weight = current->edges[i].weight;
            int candidate_cost = current_cost + edge_weight;

            if (!map_has(best_cost, neighbor) ||
                candidate_cost < map_get(best_cost, neighbor)) {
                map_set(best_cost, neighbor, candidate_cost);
                pq_push(frontier, neighbor, candidate_cost);
            }
        }
    }
}
```

Notice what's missing compared to BFS: there's no separate visited set gating entry into the frontier. Instead there's a `best_cost` map — the hash table lesson's structure, repurposed here to answer "what's the cheapest way to this node that I know about so far?" — and a node only gets pushed again when a candidate route beats the best cost recorded for it. The priority queue does the rest: because it always pops the globally cheapest pending node next, whenever the algorithm reaches a node with `current == target`, it has already ruled out every other pending route being cheaper. That's the guarantee. It's the same shape as BFS's layer-by-layer guarantee, just measured in accumulated cost instead of accumulated hops.

## Tracing it on the example

Start at `A`. Push `A` with cost `0`. `best_cost = {A: 0}`.

Pop `A` (cost 0, cheapest — and only — thing pending). Examine its edges: `B` at cost `0 + 4 = 4`, `C` at cost `0 + 1 = 1`. Neither has a recorded cost yet, so both get pushed. `best_cost = {A: 0, B: 4, C: 1}`. Frontier holds `C` (cost 1) and `B` (cost 4).

Pop `C` — the priority queue returns it over `B` because 1 is cheaper than 4, even though `B` was discovered first. This is the entire point of swapping the queue for a priority queue: arrival order stopped mattering the moment cost entered the picture. Examine `C`'s edges: `B` at cost `1 + 2 = 3`, `D` at cost `1 + 6 = 7`. `3 < 4`, so `B`'s best cost improves to `3` and it gets pushed again. `D` has no recorded cost yet, so it's pushed at `7`. `best_cost = {A: 0, B: 3, C: 1, D: 7}`. Frontier holds `B` (cost 3), `D` (cost 7), and a stale `B` entry at cost 4 that's still sitting in the queue from the first push.

Pop `B` at cost 3 — the cheapest pending entry. Examine its edge: `D` at cost `3 + 1 = 4`. `4 < 7`, so `D`'s best cost improves to `4` and gets pushed again. Frontier now holds `D` (cost 4), the stale `D` at cost 7, and the stale `B` at cost 4.

Pop `D` at cost 4 — the cheapest pending entry, and the target. Report cost `4`. Done — correctly, without ever needing to process the stale entries still sitting in the queue, because by the time they'd be popped, `best_cost` for their node would already hold a smaller number, and a real implementation checks that and skips them.

Final answer: cost `4`, matching the hand-computed cost of `A → C → B → D` from the diagram. The algorithm never explicitly reasoned about "hop count" at any point — it just kept asking the priority queue for the cheapest pending option and trusted the answer, the same way BFS keeps asking its queue for the oldest pending option and trusts that.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Pop cheapest node from priority queue"] --> B{"Is this the target?"}
    B -- "Yes" --> C["Report accumulated cost — guaranteed cheapest"]
    B -- "No" --> D["For each edge, compute candidate cost"]
    D --> E{"Cheaper than best known cost to that node?"}
    E -- "Yes" --> F["Record new best cost, push to priority queue"]
    E -- "No" --> A
    F --> A
  </div>
  <figcaption>The loop is BFS's loop with one substitution: the frontier is ordered by accumulated cost instead of discovery order, and nodes can be reconsidered whenever a cheaper route to them appears.</figcaption>
</figure>

## Why the priority queue is load-bearing, not incidental

It's worth being precise about why a plain queue can't be patched to do this job. BFS's correctness depends on the frontier draining in exactly the order nodes were discovered, because with uniform edge weights, discovery order and cost order are the same order. The moment edges have different weights, that equivalence breaks: a node discovered later can still be cheaper to reach than a node discovered earlier, exactly like `C` at cost 1 being cheaper than `B` at cost 4 despite `B` being pushed first in the trace above.

A priority queue is the structure built precisely for "give me the best pending item regardless of when it arrived" — which is the lesson from a few tracks back about urgency outranking arrival time. Dijkstra's algorithm is that lesson applied to graph traversal: cost outranks discovery order, and the binary heap underneath the priority queue keeps retrieving the cheapest pending node efficient even as the frontier grows.

This is also why a node can legitimately get pushed onto the frontier more than once, which never happened in plain BFS. `B` was pushed at cost 4, then pushed again at cost 3 once a cheaper route through `C` was found. Both copies sit in the queue; only the cheaper one matters once popped, because the `best_cost` map has already moved on. This is a direct cost of not tracking a simple visited set — the algorithm trades that simplicity for the ability to revise its mind about a node's cost as better routes are discovered, which a hard visited-on-first-touch rule would prevent.

## Where this breaks: negative weights

Dijkstra's guarantee — that popping a node from the priority queue means you've found its cheapest route — relies on costs only ever going up as you extend a path. If an edge could subtract from the accumulated cost, a node popped early as "cheapest so far" could later be undercut by a longer path that takes a shortcut through a negative edge, and the algorithm would have already reported a wrong answer and moved on.

This isn't a corner case worth hand-waving past: it's the boundary of what this specific algorithm is for. Graphs with negative edge weights need a different algorithm (Bellman-Ford is the usual answer, and it accepts a slower runtime in exchange for tolerating them). The lesson generalizes past this one algorithm: an algorithm's guarantee is only as strong as the assumption it was built on, and "costs never decrease as you extend a path" is doing invisible load-bearing work in every line of the code above.

## What carried forward

Nothing in `dijkstra()` is a new primitive. It's the hash table lesson's map, tracking best-known cost per node the way a visited set tracks membership. It's the priority queue lesson's binary heap, deciding what "next" means the way a plain queue decided it for BFS. It's the graph traversal lesson's loop shape, popping a frontier and examining edges, one node at a time. The only genuinely new idea is letting a node be reconsidered when a cheaper route to it appears — and that idea was only necessary because weighted edges broke the assumption that discovery order and cost order are the same thing.

Next time, we look at what happens when a graph doesn't have a single start node to search outward from at all — when the question isn't "what's the cheapest path from here" but "what's the minimum total cost to connect every node together," which is the problem a **minimum spanning tree** solves, and which needs yet another way of deciding what "next" means.
