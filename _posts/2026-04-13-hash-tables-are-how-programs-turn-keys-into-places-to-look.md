---
title: "Hash tables are how programs turn keys into places to look"
date: 2026-04-13 20:02:49 -0400
categories: [skills]
tags: [hash-tables, hashing, data-structures, lookup, memory, graphs, fundamentals, teaching-track]
summary: "A hash table stores data by converting a key into a bucket index, which lets programs trade tidy order for fast lookup and gives defenders another reminder that collisions are a design fact, not a personal attack."
---

Last time, we looked at graphs: memory objects connected in whatever pattern reality or poor judgment demanded. That gave us a more honest model of systems. File relationships, network paths, package dependencies, trust chains, social graphs, attack paths, and routing maps are rarely polite trees. They are graphs, and graphs do not care whether your whiteboard likes symmetry.

But the graph lesson smuggled in a practical problem.

When you traverse a graph, you usually need to remember whether you have seen a node already. If you do not, cycles will make your traversal loop forever or at least until the machine helpfully converts your bug into heat. So the traversal needs a fast way to answer a simple question:

Have I seen this key before?

You *could* keep a list and scan it every time. That works if your graph has five nodes and your standards have collapsed. At scale, that becomes expensive fast. What you want is a structure that can take a key, jump to a likely storage location, and answer membership or lookup without walking the whole collection.

That structure is the **hash table**.

A hash table is one of the most important examples of a deeper machine-level idea: sometimes the fastest way to find data is not to keep it in order, but to compute where to look.

## Start from the problem, not the mythology

Suppose a program is processing usernames:

- `"alice"`
- `"bob"`
- `"mallory"`

and it needs to answer:

- is this username already present?
- if so, where is its record?

An array can store the records just fine. The trouble starts when you want to search it. If the array is unsorted, you scan element by element. If it is sorted, you can do better, but now inserts and updates start carrying more ceremony. Either way, the structure is still organized around sequence.

A hash table is organized around **keys**.

The program takes a key such as `"alice"`, runs it through a **hash function**, and gets back a number. That number is then reduced into a valid bucket position inside an array.

So the core flow is:

```text
key -> hash function -> integer -> bucket index -> look there first
```

That is the whole trick. The table is still built on memory you already understand. Underneath the abstraction, it is usually an array of buckets. The clever part is how the program decides which bucket a key should use.

## A hash function is a routing rule

A **hash function** takes input data and deterministically produces a numeric result.

Same key in, same hash out.
Different keys often produce different hashes, but not always.

That last sentence matters. People sometimes speak about hashing as if it were a divine sorting ritual. It is not. A hash function compresses a huge input space into a limited numeric range used by the table. That means two different keys can map to the same bucket. This is called a **collision**, and collisions are normal. They are not a sign that the machine has become emotional.

Imagine a tiny table with 8 buckets:

```text
bucket:  0   1   2   3   4   5   6   7
         -   -   -   -   -   -   -   -
```

Suppose:

- `hash("alice") % 8 = 3`
- `hash("bob") % 8 = 6`
- `hash("mallory") % 8 = 3`

Now we immediately see the issue. `"alice"` and `"mallory"` both want bucket 3.

So a hash table is never just "compute an index and store the value." It is also "have a plan when several keys land in the same place."

## The physical layout is still memory plus rules

One simple way to build a hash table is:

- an array of bucket pointers
- each bucket points to a linked list of entries
- each entry stores the key, the value, and a pointer to the next entry

That should sound familiar, because it is not new magic. It is arrays plus pointers plus linked lists, wearing a fake mustache and calling itself a constant-time lookup.

Here is the shape:

```text
                +-------------------------------+
bucket array -> | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
                +-------------------------------+
                          |               |
                          v               v
                      +---------+     +---------+
                      | alice   |     | bob     |
                      | value   |     | value   |
                      | next ---|--+  | next=NULL
                      +---------+  |  +---------+
                                   |
                                   v
                              +---------+
                              | mallory |
                              | value   |
                              | next=NULL
                              +---------+
```

This design is called **separate chaining**. Each bucket holds a chain of entries that collided into the same bucket.

Lookup works like this:

1. Hash the key.
2. Reduce it to a bucket index.
3. Go to that bucket.
4. Walk the chain there, comparing actual keys until you find a match or run out.

That last part is why entries usually store the original key, not just the hash. If `"alice"` and `"mallory"` both map to bucket 3, the bucket index alone cannot tell them apart.

## A concrete example

Suppose we want to store failed login counts by username:

```c
struct Entry {
    char *username;
    int failed_attempts;
    struct Entry *next;
};

struct Entry *table[8];
```

If `"alice"` hashes to bucket 3, we place her record in `table[3]`.

Later, when another failed login arrives for `"alice"`, the program:

1. hashes `"alice"`
2. lands at bucket 3
3. walks the chain in that bucket
4. compares stored usernames
5. finds the `"alice"` record
6. increments `failed_attempts`

If `"mallory"` also lands in bucket 3, her record joins the same chain. That makes the bucket slightly slower, but the whole table can still be fast *if* the keys are spread reasonably evenly.

That "if" is where design quality lives.

## Why hash tables feel fast

If the hash function spreads keys well and the table is not too full, each lookup touches only:

- one hash computation
- one bucket access
- a short chain or probe sequence

That gives average-case lookup close to **O(1)**, meaning the work does not grow much as the table gets larger.

Notice the careful wording: **average-case**.

Worst-case behavior can still degrade badly if collisions pile up. If every key lands in the same bucket, your glorious hash table has quietly turned back into a linked list with a branding department.

So the speed comes from two cooperating facts:

- the hash function distributes keys
- the table maintains enough spare capacity

When too many entries crowd into too few buckets, performance sours. That is why hash tables usually track a **load factor**: how full the table is relative to its bucket count.

When the load factor gets too high, many implementations **resize** the table by allocating a bigger bucket array and reinserting entries into new positions. This is called **rehashing**.

That sounds annoying because it is annoying. But it preserves the property we actually care about: fast average lookup.

## Collision handling is not optional

Separate chaining is one collision strategy. Another common one is **open addressing**, where entries stay inside the bucket array itself and the program probes for another slot when the first choice is occupied.

Conceptually:

```text
hash(key) -> preferred slot
occupied? -> try another slot according to a rule
```

That rule might be linear probing, quadratic probing, or something similar. The details matter, but the big picture is simpler:

- chaining stores collisions in attached structures
- open addressing stores collisions by searching for alternate positions in the table itself

Both approaches are attempts to answer the same uncomfortable truth: different keys can want the same place.

Security people should find this emotionally familiar.

## Why this matters outside textbooks

Hash tables show up everywhere because computers are constantly translating identifiers into locations:

- usernames to account records
- IP addresses to session state
- filenames to metadata
- symbols to addresses
- cache keys to cached results
- graph nodes to visited-state

In a graph traversal, for example, a visited set is often implemented with a hash table. When you reach a node, you hash its identifier and check whether it is already present. If yes, skip it. If no, mark it visited and continue. That one structure is often the difference between "systematically explore the graph" and "accidentally benchmark a cycle forever."

Hashing also appears in security-sensitive code, but with an important warning: not every use of hashing is the same. Hash tables use hash functions for distribution and lookup. Cryptographic hashing uses very different design goals such as preimage resistance and collision resistance. Confusing the two is how people end up building systems that are both slow and wrong.

The machine does not award partial credit for saying "hash" confidently.

## The deeper lesson

A hash table is powerful because it stops treating lookup as a search through data and starts treating lookup as an address-computation problem.

That is the narrative arc of low-level computing in miniature:

- memory gives us places
- pointers let us refer to places
- arrays give us indexed places
- linked structures give us connected places
- hash tables compute likely places from keys

Once you see that, the abstraction becomes less mystical. A dictionary or map in a high-level language is not a magical cabinet of instant answers. It is usually an engineered compromise built on arrays, collision rules, resizing policies, and a hash function that is doing a lot of unpaid labor.

In the next lesson, we will look at **stacks and queues as scheduling structures**: two simple ways programs decide what work happens next, and why that choice quietly shapes everything from parsers to network services to search algorithms.
