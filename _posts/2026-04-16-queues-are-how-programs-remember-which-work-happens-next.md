---
title: "Queues are how programs remember which work happens next"
date: 2026-04-16 20:22:30 -0400
categories: [skills]
tags: [queues, fifo, buffers, breadth-first-search, scheduling, data-structures, fundamentals, teaching-track]
summary: "A queue stores pending work in first-in, first-out order, which lets programs process arrivals fairly, coordinate producers with consumers, and turn 'later' from a hand-wave into concrete state in memory."
---

Last time, we looked at maps: structures that attach facts to keys so a program can ask not just "have I seen this thing?" but "what do I know about this thing?" That gave us a durable way to store state. Counts. Status. Records. Metadata. All useful. All respectable.

But state alone does not tell a system what to do *next*.

Real programs are full of unfinished business:

- packets that have arrived but not yet been handled
- jobs waiting for a worker
- log lines buffered for processing
- graph nodes discovered but not yet explored
- requests waiting for a turn at the database

That is a different problem. The machine is no longer just remembering facts about keys. It is remembering **pending work**, and the order of that work matters.

That is where the **queue** comes in.

A queue is how programs store items that should be processed in **first-in, first-out** order: the earliest arrival is the next one to leave. The rule is simple enough to sound boring, which is usually how foundational ideas sneak past people.

## Start with the machine problem

Suppose a server receives three incoming requests in this order:

1. `REQ-A`
2. `REQ-B`
3. `REQ-C`

If one worker thread will process them one at a time, the program needs a place to keep the requests that have arrived but have not run yet.

Conceptually:

```text
arrival order: REQ-A, REQ-B, REQ-C
processing order: REQ-A, REQ-B, REQ-C
```

That sounds almost insultingly obvious, but notice what it buys you. The program now has a concrete answer to a subtle question:

```text
What does "later" mean?
```

It means "stored somewhere until earlier work is done."

Without a queue, "later" is just optimism with a scheduler problem.

## FIFO is the contract

The defining rule of a queue is **FIFO**:

- first item in
- first item out

If you insert `A`, then `B`, then `C`, removal should produce:

- `A`
- then `B`
- then `C`

That makes a queue different from the structures we just studied:

- an array stores by index
- a set stores membership
- a map stores key-to-value relationships
- a queue stores **arrival order for pending work**

This is the deeper lesson: queues are not mainly about storage. They are about **coordination over time**.

## The two core operations

Most queue interfaces reduce to two basic actions:

- **enqueue**: add an item at the back
- **dequeue**: remove an item from the front

If the queue currently holds:

```text
front -> [REQ-A] [REQ-B] [REQ-C] <- back
```

then:

- enqueue `REQ-D` puts it at the back
- dequeue removes `REQ-A`

After both operations:

```text
front -> [REQ-B] [REQ-C] [REQ-D] <- back
```

That is the whole policy. The machine is turning sequence into a fairness rule.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["enqueue REQ-A"] --> B["enqueue REQ-B"]
    B --> C["enqueue REQ-C"]
    C --> D["front of queue"]
    D --> E["dequeue REQ-A"]
    E --> F["REQ-B becomes next"]
  </div>
  <figcaption>A queue keeps pending work in arrival order so the oldest unprocessed item is handled next.</figcaption>
</figure>

## A queue is still just memory plus rules

At machine level, a queue is not a cosmic waiting room. It is memory organized so that code can add at one end and remove from the other while preserving order.

One naive implementation uses an array:

```text
index:  0      1      2      3      4
value: [A]    [B]    [C]    [ ]    [ ]
```

If `A` is dequeued, you *could* shift `B` and `C` one position left:

```text
index:  0      1      2      3      4
value: [B]    [C]    [ ]    [ ]    [ ]
```

That works. It is also wasteful, because moving every remaining item on each dequeue turns "remove one item" into "copy the neighborhood."

Programs with actual load tend to prefer a better layout.

## Ring buffers are queues with less drama

A common array-based queue uses a **ring buffer** or **circular buffer**.

Instead of shifting items, the program keeps two indexes:

- `head`: where the next dequeue happens
- `tail`: where the next enqueue happens

When either index reaches the end of the array, it wraps back to the beginning.

Imagine a buffer of size 5:

```text
index:  0    1    2    3    4
value: [ ]  [B]  [C]  [ ]  [ ]
         ^         ^
        tail      head
```

If the queue has already consumed earlier slots, `tail` can wrap around and reuse them:

```text
index:  0    1    2    3    4
value: [D]  [B]  [C]  [ ]  [ ]
         ^         ^
       tail      head
```

Nothing had to be shifted. The queue did not become smarter than memory. It just kept better bookkeeping.

That matters because queues are often hot-path structures. Packet processing, event loops, worker pools, telemetry ingestion, and log pipelines all enjoy avoiding unnecessary copying. CPUs are generous only in marketing material.

## Linked queues trade contiguity for flexibility

A queue can also be built from linked nodes:

```c
struct Node {
    Job *job;
    struct Node *next;
};

struct Queue {
    struct Node *head;
    struct Node *tail;
};
```

Here:

- `head` points to the node that will be dequeued next
- `tail` points to the node where the next enqueue will attach

Enqueue means:

1. allocate a new node
2. attach it to the old tail's `next`
3. move `tail` forward

Dequeue means:

1. read the node at `head`
2. move `head` to `head->next`
3. free the old node if appropriate

This avoids fixed capacity, which is useful, but it trades away contiguity. That means more pointer chasing, more allocations, and more opportunities for the cache to look at you with professional disappointment.

As usual, the machine offers tradeoffs, not moral purity.

## Queues model fairness and backpressure

This is where queues stop being a cute textbook structure and become operationally important.

Suppose a producer can generate jobs faster than a consumer can handle them.

If the queue keeps growing, that growth is telling you something real:

```text
arrival rate > service rate
```

That is not an abstract theorem. That is backlog.

In a message broker, it means consumers are behind.
In a web server, it means requests are piling up.
In a packet capture system, it means you are closer to dropping data.
In a security pipeline, it means "we will investigate it later" has acquired a measurable body count.

A queue therefore does two jobs at once:

- it preserves order
- it makes overload visible

This second job matters a lot. A system without queue metrics is often a system that has chosen vibes over observability.

## Breadth-first search is a queue with a graph attached

We already met graphs, and graphs introduced the problem of traversal. A depth-first walk often uses recursion or an explicit stack. But if you want to explore nodes by distance from the starting point, you need a queue.

That algorithm is **breadth-first search**.

The idea is straightforward:

1. start at one node
2. put it in a queue
3. dequeue the next node
4. enqueue its undiscovered neighbors
5. repeat

Because the queue is FIFO, nodes discovered earlier get processed earlier. That means the traversal expands outward in layers.

```text
distance 0: start node
distance 1: its immediate neighbors
distance 2: neighbors of those neighbors
```

That is why BFS finds shortest paths in an unweighted graph. Not because the graph becomes kind, but because the queue enforces exploration in order of discovery distance.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Start at A"] --> B["Queue: A"]
    B --> C["Dequeue A"]
    C --> D["Enqueue A's unseen neighbors"]
    D --> E["Dequeue next earliest-discovered node"]
    E --> F["Continue layer by layer"]
  </div>
  <figcaption>Breadth-first search works because a queue preserves the order in which nodes were discovered.</figcaption>
</figure>

That gives us a clean machine-level pattern:

- a **set** remembers which nodes were seen
- a **queue** remembers which seen nodes still need work

One tracks membership.
One tracks pending order.

Together they turn graph traversal from chaos into procedure.

## A concrete example

Suppose a help desk system receives password reset tasks in this order:

```text
task 101
task 102
task 103
```

If one worker handles them fairly, the queue state might evolve like this:

```text
enqueue 101 -> [101]
enqueue 102 -> [101, 102]
enqueue 103 -> [101, 102, 103]
dequeue     -> returns 101, queue becomes [102, 103]
enqueue 104 -> [102, 103, 104]
dequeue     -> returns 102, queue becomes [103, 104]
```

Nothing magical happened there. The queue simply preserved the truth that `102` had been waiting longer than `104`.

That sounds mild until you remove the queue and realize you have built a system where newer work can keep cutting the line. Attackers and impatient executives both enjoy that kind of bug.

## Empty, full, and blocked are real states

Queues also force a program to confront boundaries honestly.

If a queue is **empty**, a dequeue cannot succeed without waiting, failing, or inventing nonsense.

If a bounded queue is **full**, an enqueue cannot succeed without:

- blocking until space exists
- dropping the new item
- dropping an old item
- resizing the buffer
- pushing back on the producer

Those are policy decisions, not implementation details. They determine whether a system is fair, lossy, burst-tolerant, latency-sensitive, or quietly doomed.

This is one reason low-level structures matter so much. They are not just convenient boxes for data. They encode the operational behavior of the system under stress.

## The deeper lesson

A queue is how software turns future work into present state.

That is the important abstraction hiding underneath the simple FIFO rule. The queue makes time manageable by storing unfinished tasks in an order the program can enforce. It gives the machine a disciplined answer to questions like:

- who has been waiting longest?
- what should run next?
- how much work is backed up?
- are producers outrunning consumers?

Once you understand that, queues show up everywhere: network stacks, schedulers, event loops, streaming pipelines, background workers, BFS traversals, and incident-response systems full of items that were definitely going to be handled "shortly."

The machine is never doing "later" as an abstract concept. It is keeping bytes somewhere and applying policy to them.

Next time, we can follow that thread into **priority queues**, where "next" stops meaning "oldest" and starts meaning "most important." That is where scheduling becomes strategy, and fairness begins negotiating with urgency.
