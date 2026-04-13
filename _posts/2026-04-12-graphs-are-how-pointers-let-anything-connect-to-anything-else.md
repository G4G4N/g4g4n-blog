---
title: "Graphs are how pointers let anything connect to anything else"
date: 2026-04-12 20:03:27 -0400
categories: [skills]
tags: [graphs, pointers, traversal, cycles, memory, data-structures, fundamentals, teaching-track]
summary: "A graph models arbitrary relationships by letting memory objects point to many peers instead of obeying a tidy tree, which means traversal now depends on explicit reachability rules and visited-state rather than polite hierarchy."
---

Last time, we looked at recursion as stack bookkeeping for self-similar work. That got us through trees nicely, because trees are structured enough to reward good manners. Start at the root, walk down the children, stop at `NULL`, and everyone more or less cooperates.

Now we leave the supervised part of memory.

A **graph** is what happens when nodes can connect to other nodes without pretending those connections form a tidy parent-child hierarchy. In a tree, each node has one clear place in the structure. In a graph, a node can have many neighbors, several paths can lead to the same place, and cycles are not a bug in the drawing. They are part of the deal.

That makes graphs more general than trees and, naturally, more likely to produce interesting mistakes.

## Start from the memory, not the whiteboard

At machine level, a graph is still just memory objects plus references.

Here is a small C-style node:

```c
struct Node {
    char *name;
    struct Node **neighbors;
    int neighbor_count;
};
```

Each node stores:

- some payload, here a name
- a pointer to a list of neighbor pointers
- the number of neighbors in that list

That is enough to represent "A is connected to B and C" without requiring B or C to be children, descendants, or anything else so wholesome.

Imagine these connections:

- `A` connects to `B`
- `A` connects to `C`
- `B` connects to `D`
- `C` connects to `D`
- `D` connects back to `A`

Conceptually:

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["A"] --> B["B"]
    A --> C["C"]
    B --> D["D"]
    C --> D
    D --> A
  </div>
  <figcaption>A graph allows multiple paths and cycles, which means traversal cannot rely on hierarchy to keep it honest.</figcaption>
</figure>

The key feature is not the picture. It is the fact that the program can follow pointers from one node to another, and those pointers do not have to form a tree. Once that restriction is gone, the structure can model road networks, social links, dependency edges, state machines, routing maps, build graphs, and call relationships. Real systems love graphs because real systems are full of relationships that refuse to stay in a single neat hierarchy.

## Trees are a special case with better posture

A tree is a graph with extra rules:

- one distinguished root
- no cycles
- every non-root node has exactly one parent

Those rules buy us clarity. If you walk downward in a tree, you do not need to worry that a child eventually points back to an ancestor and sends your recursive function into a small abyss.

A general graph does not give you that protection.

That is the first serious conceptual jump:

**In a graph, "what is reachable?" matters more than "where is the parent?"**

The machine no longer gets hierarchy for free. It gets connectivity. Your code must decide what counts as already seen, where traversal should start, and when to stop following edges.

## Reachability is the question graphs ask

Suppose node `A` is a web service, node `B` is a database, node `C` is a cache, and node `D` is an admin panel. The interesting question is often not "which node is the parent of `D`?" The interesting question is:

- can I get from `A` to `D`?
- how many hops does it take?
- are there several paths?
- does a cycle keep me wandering forever?

That idea is called **reachability**. If there is a path of edges from one node to another, the second node is reachable from the first.

This is why graphs matter operationally. Attack paths are graphs. Network trust relationships are graphs. Package dependencies are graphs. Lateral movement is basically graph theory with budget approvals and a bad attitude.

## Traversal now needs memory about the traversal

A naive recursive walk over a tree can stop at `NULL` and survive. A naive recursive walk over a graph can revisit the same node forever.

Consider this code:

```c
void walk(struct Node *node) {
    if (node == NULL) {
        return;
    }

    printf("%s\n", node->name);

    for (int i = 0; i < node->neighbor_count; i++) {
        walk(node->neighbors[i]);
    }
}
```

On a cyclic graph, this is not a traversal. It is a self-harm protocol.

If `D` points back to `A`, then `walk(A)` eventually calls `walk(D)`, which calls `walk(A)` again, and the stack keeps growing until the process runs out of patience or memory. Usually both.

So graph traversal needs an extra structure: a **visited set**.

```c
void walk(struct Node *node, struct Set *visited) {
    if (node == NULL) {
        return;
    }

    if (set_contains(visited, node)) {
        return;
    }

    set_add(visited, node);
    printf("%s\n", node->name);

    for (int i = 0; i < node->neighbor_count; i++) {
        walk(node->neighbors[i], visited);
    }
}
```

Now the traversal has a memory of where it has already been. That is the critical graph idea. The program cannot infer "already processed" from shape alone, because the shape no longer guarantees uniqueness of path.

This is one of those lessons that keeps reappearing in security work. If you analyze dependency chains, follow object references, inspect nested permissions, or crawl identity relationships, the difference between "we saw this node already" and "we forgot to track that" is often the difference between a clean result and a pager event.

## Depth-first and breadth-first are policy choices

Once you have visited tracking, there are several honest ways to walk a graph.

**Depth-first search (DFS)** goes as far as possible along one path before backing up. It is naturally expressed with recursion or an explicit stack.

**Breadth-first search (BFS)** visits all nodes one edge away, then all nodes two edges away, and so on. It is usually implemented with a queue.

Imagine starting at `A` in the earlier graph:

- DFS might visit `A`, then `B`, then `D`, then return and eventually visit `C`
- BFS would visit `A`, then `B` and `C`, then `D`

Same graph. Different policy. Different questions answered efficiently.

If you want to know whether something is reachable at all, either approach can work. If you want the shortest path in an unweighted graph, BFS is usually the right first move because it explores by hop count. DFS is often simpler for exhaustive exploration and structural analysis.

So the abstraction is not "graphs have one traversal." The abstraction is "graphs require a traversal policy matched to the question."

## Concrete example: why cycles change the engineering

Suppose a package manager stores dependencies like this:

- `app` depends on `auth-lib` and `logging-lib`
- `auth-lib` depends on `crypto-lib`
- `logging-lib` depends on `crypto-lib`

That is already a graph because two nodes point at the same dependency. It is not a tree; `crypto-lib` has more than one incoming edge.

Now suppose a bad metadata release accidentally creates:

- `crypto-lib` depends on `app`

Congratulations. You have a cycle.

If your dependency walker assumes tree structure, it may recurse forever or process the same package repeatedly. If it tracks visited nodes, it can detect the loop and keep moving like a professional. The data did not become evil. Your assumptions became insufficient.

That is the broader lesson: graphs punish unstated assumptions about uniqueness, ownership, and one-way flow.

## Directed and undirected edges are a trust question

Some graphs have edges with direction. `A -> B` means you can move from `A` to `B`, not automatically from `B` to `A`. That is a **directed graph**.

Other graphs treat connections as mutual. If two cities are joined by an undirected road edge in a simplified map, the relationship works both ways.

Direction matters because it changes what "reachable" means.

In security terms:

- "host A can initiate SSH to host B" is directed
- "these two systems share a VLAN" may be modeled as undirected for some questions

The machine does not care which interpretation you intended. You express direction by how you store the edges. If your edge model is sloppy, your analysis will be too.

## The durable mental model

Keep the machine-level version:

A graph is a set of nodes plus edges that express arbitrary connectivity.

That means:

- multiple paths may reach the same node
- cycles may exist
- traversal must track visited state
- the choice of stack, queue, or recursion reflects the traversal policy

Once you understand that, graphs stop looking like abstract math wallpaper and start looking like the native language of real-world relationships. Because they are.

Trees were comforting because they imposed order on pointers. Graphs are what happens after you admit the world is not arranged for your convenience.

Next time, we will make that even more concrete with **queues**, the humble first-in-first-out structure that powers breadth-first search and a surprising amount of practical scheduling.
