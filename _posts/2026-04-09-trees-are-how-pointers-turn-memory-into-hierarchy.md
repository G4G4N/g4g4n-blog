---
title: "Trees are how pointers turn memory into hierarchy"
date: 2026-04-09 20:33:47 -0400
categories: [skills]
tags: [trees, pointers, memory, data-structures, hierarchy, traversal, fundamentals, teaching-track]
summary: "A tree stores hierarchy by letting each node point to children, which turns raw addresses into parent-child structure and makes lookup, traversal, and whole families of data structures easier to reason about from the machine up."
---

Last time, we looked at linked lists: a sequence built from separate nodes where each node points to the next one. That mattered because it broke a useful illusion. Order does not have to come from contiguity. A program can create structure just by storing addresses.

Now we take one step up from sequence to hierarchy.

A linked list says, "from here, there is one next thing."
A tree says, "from here, there may be several next things, and they are related in a parent-child shape."

That is a bigger jump than it first appears. Sequences are fine for logs, buffers, and ordered collections. But real systems are full of hierarchy: file paths, DOM nodes, process trees, certificate chains, parsers, menu structures, directory layouts, heaps, syntax trees, and many kinds of search indexes. The machine does not receive "hierarchy" as a gift from the universe. It builds it out of memory objects and pointers.

A **tree** is what happens when a node can point to more than one other node, and we agree that those pointed-to nodes are its **children**.

## Start with the smallest useful shape

Suppose we define a binary tree node in C:

```c
struct Node {
    int value;
    struct Node *left;
    struct Node *right;
};
```

This node stores:

- one payload value
- one pointer to a left child
- one pointer to a right child

If both pointers are `NULL`, the node has no children. That makes it a **leaf**. If one or both pointers are non-`NULL`, this node is connected downward to more nodes.

Imagine memory like this:

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["0x5000\nvalue=8"] --> B["0x90a0\nvalue=3"]
    A --> C["0x71c0\nvalue=10"]
    B --> D["0x8120\nvalue=1"]
    B --> E["0x88f0\nvalue=6"]
    C --> F["NULL"]
    C --> G["0x9b40\nvalue=14"]
  </div>
  <figcaption>A tree stores hierarchy by letting each node point to multiple children instead of a single next node.</figcaption>
</figure>

The addresses are scattered because pointer-based structures do not require neat physical layout. The shape lives in the references. The node at `0x5000` is the **root** because it is the trusted entry point. From there, software can walk left or right, then left or right again, and so on.

That is the essential mental model:

- a tree is not "drawn downward" in memory
- a tree is a set of nodes plus pointer relationships
- the visible hierarchy is imposed by those relationships

The drawing helps humans. The pointers do the real work.

## Root, parent, child, leaf, path

Tree vocabulary can sound suspiciously botanical, but it is just bookkeeping for pointer relationships.

If node `8` points to node `3`, then:

- `8` is the **parent**
- `3` is the **child**

If node `3` points to nodes `1` and `6`, then `1` and `6` are siblings because they share the same parent. A **path** is the sequence of nodes you visit while following pointers from one node to another, such as:

```text
8 -> 3 -> 6
```

A **leaf** is a node with no children. In the example above, `1`, `6`, and `14` are leaves.

This terminology matters because once structures become hierarchical, position is no longer just "item number 7." Position becomes "reachable from the root by this sequence of choices." That is how a lot of real software navigates. Filesystems, for example, are not arrays with good PR. They are hierarchies with naming rules and a long history of making everyone else's day worse.

## A tree generalizes the linked list

A linked list node usually has one outgoing pointer: `next`.

A tree node has multiple possible outgoing pointers.

That means you can think of a linked list as a very restricted tree where each node gets at most one child. The machine-level lesson carries forward cleanly:

- linked list: follow one pointer repeatedly
- tree: choose among several pointers repeatedly

That one change creates a structure that can represent branching decisions instead of just linear order.

This is why trees show up everywhere. Programs frequently need to model "from this point, several valid futures exist." A parser may have branches. A search structure may split values into regions. A UI may contain nested children. An attacker may also contain nested children, but that is usually called an affiliate program.

## Traversal is controlled pointer-following

Because a tree is scattered across memory, code needs a traversal strategy. You cannot ask for "node 12" the way you ask for `array[12]`. You start at the root and follow relationships.

Here is a simple recursive traversal:

```c
void visit(struct Node *node) {
    if (node == NULL) {
        return;
    }

    visit(node->left);
    printf("%d\n", node->value);
    visit(node->right);
}
```

This performs an **in-order traversal** for a binary tree:

1. visit the left subtree
2. process the current node
3. visit the right subtree

That traversal order is not magic. It is a policy. Trees often have several useful traversal orders:

- **pre-order**: current, then children
- **in-order**: left, current, right
- **post-order**: children, then current

The important low-level point is that traversal is still pointer-following. The fancy terminology just tells you *when* to process each node during that walk.

## Why the shape matters

The shape of a tree strongly affects how much work the machine must do.

Suppose you use a binary search tree, where smaller values go left and larger values go right. If the tree is reasonably balanced, searching for a value can skip large parts of the structure:

- compare with the root
- choose left or right
- compare again
- repeat

That can be efficient because each decision discards a large fraction of the remaining search space.

But if the tree becomes badly skewed, such as inserting sorted values into a naive binary search tree, the structure can collapse into something list-like:

```text
1
 \
  2
   \
    3
     \
      4
```

At that point, your "tree" has the practical charisma of a linked list with extra paperwork. The structure still works, but it loses the performance advantages that made the tree attractive in the first place.

This is a recurring systems lesson: an abstraction may promise one cost model while the actual shape in memory quietly negotiates a worse one.

## Trees are excellent for hierarchical meaning

Trees are not only about performance. They are also about representation.

Consider a filesystem path:

```text
/home/gagan/projects/blog/_posts
```

You can model that as a tree:

- `/` has child `home`
- `home` has child `gagan`
- `gagan` has child `projects`
- `projects` has child `blog`
- `blog` has child `_posts`

Now imagine directories with multiple entries. The hierarchy branches naturally. The same idea appears in:

- HTML documents, where elements contain child elements
- abstract syntax trees, where expressions contain sub-expressions
- organization charts, where managers point to reports
- certificate chains, where one object vouches for another in a structured path

The abstraction is different in each case, but the machine-level story is stubbornly similar: node objects plus references plus traversal rules.

## Trees and security intuition

Trees are also useful for security thinking because they teach you to distrust "obvious" structure.

When data is hierarchical, the program often assumes that child relationships are valid, acyclic, and well-bounded. If those assumptions fail, you get familiar classes of problems:

- cycles where a tree was expected, causing infinite traversal or repeated processing
- deep nesting that blows the call stack or exhausts parser limits
- missing `NULL` checks that turn bad pointers into crashes
- ownership confusion when nodes are freed while still referenced elsewhere
- attacker-controlled shapes that trigger worst-case behavior

This is one reason parsers, deserializers, and tree-walking engines deserve respect. They are not just "reading some structured data." They are interpreting pointer-like relationships, sometimes from hostile input, and betting that the shape will be sane. That bet does not always age well.

## The durable mental model

If you want the version that stays useful after the syntax fades, keep this:

A tree is:

- one root pointer
- many nodes, usually scattered across memory
- child pointers in each node
- a hierarchy created by following those pointers
- traversal rules that determine how code walks and processes the structure

A tree does not exist because memory looks like a tree. Memory rarely cooperates to that degree. A tree exists because the program treats certain references as parent-child links and consistently follows that contract.

That is the step upward from linked lists that matters. Sequence was our first pointer-built structure. Hierarchy is the next one. Once you understand that, higher-level structures become less mystical. They are still made of addresses, layout, and rules, just wearing better names.

Next time, we will make that hierarchy more operational by looking at **stacks and recursion**, where function calls themselves form a disciplined structure in memory and the machine starts keeping track of "where to return" with all the warmth of a very organized threat actor.
