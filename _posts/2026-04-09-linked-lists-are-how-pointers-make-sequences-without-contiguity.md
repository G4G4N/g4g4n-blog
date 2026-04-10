---
title: "Linked lists are how pointers make sequences without contiguity"
date: 2026-04-09 10:10:26 -0400
categories: [skills]
tags: [linked-lists, pointers, memory, data-structures, nodes, fundamentals, teaching-track]
summary: "A linked list stores sequence by chaining nodes together with pointers, which trades array-style contiguity and fast indexing for flexible insertion and a layout the CPU can distrust on sight."
---

Last time, we looked at strings as byte arrays with a termination rule. That kept us in familiar terrain: contiguous memory, one byte after another, with a clear starting point and a rule for where the useful part ends.

That is a powerful model, but it is not the only way software can represent a sequence.

Sometimes a program wants several items in order, but it does not want them packed tightly in one uninterrupted region. Sometimes the program cannot easily resize that region. Sometimes it wants to insert or remove elements without shoving every later element up or down in memory like chairs at a badly managed wedding.

That is where the linked list shows up.

A **linked list** is a sequence built out of separate memory objects called **nodes**, where each node stores:

- some data
- a pointer to the next node

That is the whole trick. The elements do not sit next to each other in memory. The sequence exists because each node knows where the next node lives.

Arrays give you order through contiguity.
Linked lists give you order through pointers.

Both are valid. Both are useful. One is much friendlier to CPU caches. The other is much friendlier to mid-sequence insertions. Computer science, as usual, is mostly organized compromise with better branding.

## Start with one node

Imagine a tiny C struct like this:

```c
struct Node {
    int value;
    struct Node *next;
};
```

Each node contains an integer and a pointer. If `value` is `7` and `next` points to another node, then this node means: "my payload is 7, and the next element in the sequence starts over there."

The important shift is conceptual. In an array, "next" means "the next bytes after this element." In a linked list, "next" means "follow this stored address."

So if the first node lives at `0x5000`, the next at `0x9030`, and the third at `0x71a0`, that is perfectly fine. Ugly, but fine. A linked list does not require neighboring addresses. It requires correct pointers.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["0x5000\nvalue=7\nnext=0x9030"] --> B["0x9030\nvalue=11\nnext=0x71a0"]
    B --> C["0x71a0\nvalue=42\nnext=NULL"]
  </div>
  <figcaption>A linked list stores sequence by chaining addresses, not by placing elements next to each other.</figcaption>
</figure>

Notice how disorderly the addresses are. That is not a mistake. That is the design.

## The head pointer is how you enter the list

Because the nodes are scattered, the program needs one trusted starting point. That starting point is usually called the **head**.

```c
struct Node *head = first_node;
```

If `head` contains `0x5000`, then code can:

1. read the node at `0x5000`
2. look at its `next` pointer
3. jump to that address
4. repeat until `next` is `NULL`

`NULL` is the end-of-list marker, much like `'\0'` marks the end of a C string. Different structure, similar idea: a special sentinel tells traversal code when to stop before it wanders off into memory and starts making poor life choices.

Conceptually, traversal looks like this:

```c
struct Node *current = head;

while (current != NULL) {
    printf("%d\n", current->value);
    current = current->next;
}
```

This loop does not compute `base + index * size` the way an array does. It follows pointers one node at a time. That difference changes almost everything about performance and behavior.

## A linked list is sequence without indexing arithmetic

With an array, element `n` is easy to reach:

```text
base_address + (n * element_size)
```

That gives arrays one of their biggest advantages. Indexing is direct arithmetic.

With a linked list, there is no such shortcut. To find the fifth element, you usually have to start at the head and follow four `next` pointers in order:

```text
head -> node 1 -> node 2 -> node 3 -> node 4 -> node 5
```

That means linked lists are bad at random access. If you want "item 5000," the list does not smile and hand it over. It says, "certainly, please walk through the first 4999 nodes and try not to trip."

This is the first major tradeoff:

- arrays are excellent for direct indexing
- linked lists are not

If you ignore that tradeoff, performance bugs will find you with professional enthusiasm.

## Why anyone uses them anyway

So why tolerate this pointer-chasing carnival at all?

Because linked lists make some updates cheap in ways arrays do not.

Suppose you have three nodes:

```text
[7] -> [11] -> [42]
```

Now you want to insert a new node with value `9` between `7` and `11`.

In a linked list, if you already have a pointer to the `7` node and the new node:

1. set `new->next` to point to `11`
2. set `old->next` to point to `new`

Done. You rewired two pointers.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["before\n7 -> 11 -> 42"] --> B["new node\n9"]
    B --> C["after\n7 -> 9 -> 11 -> 42"]
  </div>
  <figcaption>Insertion in a singly linked list is usually pointer rewiring, not bulk memory movement.</figcaption>
</figure>

In an array, inserting near the front often means shifting every later element one slot to the right to make room. If the array is full, it may also require allocating a larger region and copying everything over.

So the second major tradeoff is:

- arrays are better when you want compact storage and fast lookup by index
- linked lists are better when you want to splice nodes in and out without moving all later elements

Of course, "better" depends on the actual workload. Data structures are not religions. They are expense reports.

## The memory layout is less predictable

This matters more than introductory explanations usually admit.

Because linked-list nodes often live at unrelated addresses, traversing a list means jumping around memory. That tends to be worse for cache locality than reading a contiguous array. CPUs are very good at pulling in nearby memory because programs often use nearby memory next. Arrays cooperate with that instinct. Linked lists, by contrast, behave like a scavenger hunt planned by an adversary.

That does not make linked lists wrong. It means their cost model is different:

- more pointer overhead per element
- more heap allocation in many implementations
- more cache misses during traversal
- less copying for certain insertions and removals

If you only learn the textbook story, linked lists can sound universally elegant. If you learn the machine story, they sound like a tactical choice with paperwork attached.

## Removal is also pointer surgery

Deletion follows the same principle as insertion. Suppose you want to remove the node containing `11` from:

```text
[7] -> [11] -> [42]
```

If you have a pointer to the node before it, you can change:

```text
7.next = 11
```

into:

```text
7.next = 42
```

Now the `11` node is no longer part of the chain.

That sounds simple because it is. It is also a good place to make catastrophic mistakes:

- forgetting to update the pointer before freeing the node
- keeping a stale pointer to a removed node
- accidentally skipping a node
- creating a cycle when you meant to create a straight chain

Linked lists are one of those structures that look charming on a whiteboard and become a reliability interview the moment memory management enters the room.

## Singly linked means one direction

The examples above are **singly linked lists**. Each node knows only its successor.

That means traversal naturally moves forward. If you want to go backward, a singly linked list cannot help you unless you start over from the head and walk again. Some implementations solve that by storing both `next` and `prev`, forming a **doubly linked list**. That buys easier removal and backward traversal at the cost of extra pointer storage and extra bookkeeping.

The machine-level lesson stays the same: sequence can be represented either by physical adjacency or by stored references. Linked lists are the clearest demonstration of the second approach.

## The durable mental model

If you want the version of this lesson that keeps paying rent in your head, keep this:

A linked list is not "an array, but worse" or "an abstract sequence of items." It is:

- one entry pointer, usually called `head`
- many separate nodes in memory
- a payload in each node
- a pointer in each node that tells you where the next node lives
- a sentinel such as `NULL` that marks the end

That is why linked lists matter. They teach you that order in a program does not have to come from layout alone. It can come from references. Once that clicks, a lot of larger structures make more sense: trees, graphs, hash buckets, free lists in allocators, kernel object lists, and all sorts of systems code built out of "this thing points to the next thing."

It also sharpens your security intuition. Every extra pointer is another place where stale ownership, unsafe frees, list corruption, or attacker-controlled linkage can turn a neat data structure into an incident report.

Next time, we will build on this idea by looking at **trees**, where pointers stop making a simple chain and start building hierarchies. That is where sequences become structure, and where memory starts looking a lot more like decisions.
