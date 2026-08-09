---
title: "Graph traversal is how programs decide which node to visit next"
date: 2026-08-09 14:12:00 -0400
categories: [skills]
tags: [graphs, breadth-first-search, depth-first-search, queues, recursion, algorithms, fundamentals, teaching-track]
summary: "Breadth-first and depth-first search are the two disciplined answers to the same question a graph always asks — which node do you visit next — and the answer you pick determines whether you find the shortest path, the full structure, or nothing at all before running out of memory."
---

Two tracks ago we let recursion pay for the same subproblem more than once and called it dynamic programming, then watched greedy algorithms skip the cache entirely by proving each local choice was already the global answer. Both of those techniques answered a narrow question: *given a sequence of choices, what is the best one at each step?*

Graph traversal answers a more basic question first: *given a structure where any node might connect to any other, what order do you even visit them in?*

We touched this when we covered graphs — a visited set was necessary to keep a cyclic structure from sending a naive recursive walk into an infinite loop, and we named breadth-first search and depth-first search as two policies for choosing what to visit next. This lesson makes both of those policies concrete: how each one is actually implemented, what each one guarantees, and why the choice between them is not a style preference but a decision about what question you are trying to answer.

## The same graph, two different walks

Take the graph from the earlier lesson: `A` connects to `B` and `C`; `B` and `C` both connect to `D`; `D` connects back to `A`.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["A"] --> B["B"]
    A --> C["C"]
    B --> D["D"]
    C --> D
    D --> A
  </div>
  <figcaption>The same graph from the earlier lesson on graphs, now the fixed structure both traversal policies will walk.</figcaption>
</figure>

Starting at `A`, there are two disciplined ways to visit every reachable node exactly once. Breadth-first search visits `A`, then everything one edge away (`B` and `C`), then everything two edges away (`D`). Depth-first search visits `A`, commits to one neighbor — say `B` — follows it all the way to `D`, and only backs up to try `C` once that path is exhausted.

Same nodes. Same edges. Different order. The order is not incidental; it is the entire content of the algorithm, and it comes from the data structure each one uses to decide what to visit next.

## Breadth-first search uses a queue

Breadth-first search (BFS) is what you get when the "visit next" decision is handed to a **queue** — the first-in-first-out structure we covered a few lessons ago, where the first thing added is the first thing removed.

```c
void bfs(struct Node *start) {
    struct Queue *frontier = queue_create();
    struct Set *visited = set_create();

    queue_push(frontier, start);
    set_add(visited, start);

    while (!queue_empty(frontier)) {
        struct Node *current = queue_pop(frontier);
        printf("%s\n", current->name);

        for (int i = 0; i < current->neighbor_count; i++) {
            struct Node *neighbor = current->neighbors[i];
            if (!set_contains(visited, neighbor)) {
                set_add(visited, neighbor);
                queue_push(frontier, neighbor);
            }
        }
    }
}
```

Walk through it on the example graph. `frontier` starts with `[A]`. Pop `A`, print it, push its unvisited neighbors: `frontier` becomes `[B, C]`. Pop `B`, print it, push its unvisited neighbor `D`: `frontier` becomes `[C, D]`. Pop `C`, print it; `D` is already visited, so nothing new is pushed: `frontier` becomes `[D]`. Pop `D`, print it; its only neighbor, `A`, is already visited. `frontier` is empty. Done.

Output order: `A, B, C, D`. Every node one edge from `A` gets visited before any node two edges from `A`. That is not a side effect — it is what a FIFO queue guarantees. Nodes get pushed in the order they are discovered, and discovery happens layer by layer, so the queue naturally drains in the same layered order it filled.

This is the property that makes BFS the right first move whenever you need the **shortest path in an unweighted graph**. Because BFS visits nodes in strict order of distance from the start, the first time it reaches any given node is guaranteed to be via a shortest path to that node. You can prove this by adding one field to the algorithm: track the distance each node was discovered at, one more than the node that discovered it. When BFS reaches `D` through `B`, `D` gets recorded at distance 2. If BFS later found another path to `D`, it would arrive no earlier, because everything at distance 2 was already exhausted before distance 3 began.

## Depth-first search uses a stack — implicit or explicit

Depth-first search (DFS) hands the same decision to a **stack**, the last-in-first-out structure. Most often that stack is implicit, provided by the language's own call stack through recursion — the same mechanism we covered when we looked at how recursion turns one procedure into many frames.

```c
void dfs(struct Node *node, struct Set *visited) {
    if (set_contains(visited, node)) {
        return;
    }

    set_add(visited, node);
    printf("%s\n", node->name);

    for (int i = 0; i < node->neighbor_count; i++) {
        dfs(node->neighbors[i], visited);
    }
}
```

This is close to the visited-tracking walk from the graphs lesson, and that is not a coincidence — that walk *was* depth-first search. It just wasn't named yet.

Trace it on the same graph. Call `dfs(A)`. Mark `A` visited, print it, then recurse into its first neighbor, `B`. Call `dfs(B)`. Mark `B` visited, print it, recurse into `B`'s neighbor, `D`. Call `dfs(D)`. Mark `D` visited, print it, recurse into `D`'s neighbor, `A` — already visited, return immediately. Back in `dfs(D)`, no more neighbors, return. Back in `dfs(B)`, no more neighbors, return. Back in `dfs(A)`, move to the second neighbor, `C`. Call `dfs(C)`. Mark `C` visited, print it, recurse into `C`'s neighbor, `D` — already visited, return. Back in `dfs(C)`, done. Back in `dfs(A)`, no more neighbors, done.

Output order: `A, B, D, C`. DFS commits to a path and rides it to the end before backing up to try alternatives — exactly the behavior the call stack gives you for free. Every recursive call is a stack frame waiting for the calls below it to finish, which is a stack in every sense that matters, even though no `struct Stack` appears anywhere in the code.

You can make the stack explicit instead of relying on recursion, which matters when a graph is deep enough that the call stack would overflow:

```c
void dfs_iterative(struct Node *start) {
    struct Stack *pending = stack_create();
    struct Set *visited = set_create();

    stack_push(pending, start);

    while (!stack_empty(pending)) {
        struct Node *current = stack_pop(pending);
        if (set_contains(visited, current)) {
            continue;
        }
        set_add(visited, current);
        printf("%s\n", current->name);

        for (int i = 0; i < current->neighbor_count; i++) {
            stack_push(pending, current->neighbors[i]);
        }
    }
}
```

Swap `stack_pop` for `queue_pop` — last-in-first-out for first-in-first-out — and this is line-for-line the same shape as the BFS implementation above. That symmetry is the whole lesson compressed into one line of diff: **BFS and DFS are the same algorithm with two different data structures deciding what "next" means.**

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Pop a node from the frontier"] --> B["Already visited?"]
    B -- "Yes" --> A
    B -- "No" --> C["Mark visited, process node"]
    C --> D["Push unvisited neighbors onto the frontier"]
    D --> A
    E["Frontier = Queue → Breadth-first"] -.-> A
    F["Frontier = Stack → Depth-first"] -.-> A
  </div>
  <figcaption>One traversal loop, two possible frontiers. The choice of queue or stack is the only thing separating BFS from DFS.</figcaption>
</figure>

## Why the choice is not cosmetic

Since BFS and DFS share a skeleton, it is tempting to treat picking one as a style preference. It is not. Each structure guarantees something different about the order nodes get visited, and that guarantee is what makes one or the other the right tool for a specific question.

**Shortest path, unweighted.** BFS, always. The layer-by-layer guarantee means the first path found to any node is a shortest path. DFS gives you *a* path, with no guarantee it is short — a DFS from `A` to `D` in a large graph might wander through most of the graph's structure before happening to reach `D`, even though `D` is one hop away.

**Full structural exploration.** DFS is usually the more natural fit — detecting cycles, finding connected components, checking whether a graph can be split into independent pieces, or exploring a decision tree of possibilities (a maze, a puzzle, a dependency chain) where you want to fully commit to one branch before abandoning it. The recursion mirrors the problem's own recursive structure, which is often why the code reads more naturally.

**Memory shape under load.** BFS's queue holds an entire frontier at once — every node exactly one step further than the last one processed. In a graph that fans out quickly, that frontier can get very large before the traversal ever gets deep. DFS's stack only holds one path's worth of ancestry at a time, which is usually far smaller, at the cost of potentially wandering long distances from the start before doubling back.

None of these are arbitrary rules. They all fall out of the same fact: a queue drains in discovery order, a stack drains in reverse discovery order, and "discovery order" versus "reverse discovery order" is the difference between exploring outward evenly and exploring one direction fully before trying the next.

## What both share with everything before them

Underneath the queue and the stack, both traversals are doing the same primitive work this series keeps returning to: following pointers, checking membership in a set, and processing one node at a time. The visited set is the hash table or set structure we covered earlier, chosen specifically because it answers "have I seen this?" in constant time regardless of how large the graph gets — a linear scan through a visited list would work correctly but would turn an `O(V + E)` traversal into something far slower on any graph of consequence.

That complexity bound — `O(V + E)`, visiting every vertex once and examining every edge once — holds for both BFS and DFS, because both algorithms do exactly the same amount of work: visit each node exactly once, and check each edge exactly once to see if it leads somewhere new. The queue and the stack change the *order* of that fixed amount of work, not the *amount*. This is the same lesson from when we studied algorithmic complexity: two algorithms can do identical amounts of work and still be suited to entirely different problems, because the problem was never only about how much work gets done. It was also about what order it happens in.

Next time, we put weights on the edges. Unweighted BFS finds the shortest path by hop count, but real graphs — road networks, service dependency graphs, network routes — usually have edges that cost different amounts to cross. Finding the cheapest path through a weighted graph needs more than a queue. It needs the priority queue we covered earlier, repurposed to always expand the cheapest known path first — the algorithm known as **Dijkstra's algorithm**.
