---
title: "Greedy algorithms are how programs make the locally best choice without looking back"
date: 2026-07-12 13:28:00 -0400
categories: [skills]
tags: [greedy-algorithms, dynamic-programming, algorithmic-complexity, priority-queues, algorithms, fundamentals, teaching-track]
summary: "A greedy algorithm makes the locally optimal decision at each step and never revisits it, which produces elegant and efficient solutions when the greedy choice provably leads to a global optimum — and quietly wrong answers when it does not."
---

Last time, we gave recursion a memory. Dynamic programming noticed that a recursive function often solves the same subproblem many times — computing `fib(3)` separately in every branch of the call tree that needed it — and fixed that waste by storing each answer and reusing it. The technique is universal: if a problem has overlapping subproblems and optimal substructure, DP will find the correct answer. It may do a lot of work to do so, but it will do it correctly.

Today we look at a bet that goes the other direction.

What if, instead of exploring subproblems and caching every result, you could solve the problem by making one choice at each step — the locally best choice available right now — and never looking back? No cache. No recursive branching. Just a sequence of decisions, each made greedily, each assumed to contribute directly to the final answer.

That is the shape of a **greedy algorithm**. When the bet pays off, you get a solution that is faster and simpler than DP, often by a significant margin. When it does not, you get an answer that is plausible and wrong.

Knowing when to trust the bet is most of what makes greedy algorithms worth studying.

## The activity selection problem

Start with a concrete problem. You are given `n` activities, each with a start time and an end time. You want to schedule as many activities as possible without any two overlapping.

With small inputs you could try every possible subset and pick the largest non-conflicting one. With large inputs, that approach becomes intractable: the number of subsets to evaluate explodes exponentially, the same way naive Fibonacci did before we gave it a cache.

The greedy approach is:

1. Sort the activities by end time, earliest first.
2. Pick the first activity.
3. For each remaining activity, pick it if its start time is at or after the end time of the last activity you picked.
4. Continue until no activities remain.

That is the whole algorithm. No cache. No recursion. No comparing alternative selections.

Here is why it works. At every step, picking the activity that ends earliest leaves the most remaining time for future activities. Any other choice at that step — picking an activity that ends later — can only reduce or equal the time available for what comes next. The locally best decision is also globally best, and the proof holds at every step.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Sort activities by end time"] --> B["Pick first activity"]
    B --> C{"More activities remaining?"}
    C -- "Yes" --> D{"Starts at or after last end time?"}
    D -- "Yes" --> E["Pick it. Update last end time."]
    D -- "No" --> F["Skip it."]
    E --> C
    F --> C
    C -- "No" --> G["Done — return selected activities"]
  </div>
  <figcaption>Activity selection in greedy order: always pick the available activity that ends earliest. No backtracking required.</figcaption>
</figure>

The time complexity is `O(n log n)` for the sort, then `O(n)` for the sweep. Compare that to the exhaustive subset approach, which is exponential in `n`. The savings come entirely from the fact that the greedy choice at each step is provably correct, which means the algorithm never needs to explore alternatives.

## The two properties that make greedy work

Greedy algorithms are not magic. They work precisely when two conditions hold.

**Optimal substructure** — the same property dynamic programming needs. The optimal solution to the full problem contains optimal solutions to its subproblems. For activity selection: once you have picked the first activity, the remaining problem is "schedule as many non-conflicting activities as possible from those that remain," which has exactly the same structure and can be solved independently.

**The greedy choice property** — this is what distinguishes greedy from DP. A locally optimal choice at each step always leads to a globally optimal solution. For activity selection, picking the earliest-ending available activity is always the right call, not just sometimes but provably always. You do not need to compare the long-term consequences of different choices because the earliest-ending choice provably dominates all alternatives.

Dynamic programming needs only optimal substructure. It handles problems where the greedy choice property does not hold by exploring all subproblems and caching results. Greedy algorithms need both properties, and in exchange they do far less work.

When the greedy choice property holds, the algorithm effectively collapses the DP call tree. Instead of branching on every possible decision and reconciling the best result, it makes one decision at each step and moves forward.

## Coin change: when greedy works and when it does not

The coin change problem is the standard illustration of greedy's limits.

Suppose you need to make change for `n` cents using the fewest coins possible. The greedy approach is intuitive: always pick the largest denomination that does not exceed the remaining amount.

With standard US denominations (25¢, 10¢, 5¢, 1¢), this works. To make change for 36¢:

```text
36 - 25 = 11   (pick a quarter)
11 - 10 =  1   (pick a dime)
 1 -  1 =  0   (pick a penny)
```

Three coins. That is optimal.

Now try a different set of denominations: 1¢, 3¢, and 4¢. Make change for 6¢ using the same greedy strategy:

```text
6 - 4 = 2   (pick the 4¢ coin)
2 - 1 = 1   (pick a penny)
1 - 1 = 0   (pick a penny)
```

Three coins. But two 3¢ coins also makes 6¢, in just two coins. Greedy failed to find the optimal solution.

The problem is that the greedy choice property does not hold for arbitrary coin denominations. The locally largest coin is not always part of the globally optimal selection. A different denomination structure can make the greedy choice cut off paths to better answers.

This problem requires dynamic programming: build a table of minimum coin counts for every amount from 1 to `n`, computing each entry from the smaller entries before it. The same tabulation pattern we used for Fibonacci works here — fill entries in order so every entry's dependencies are already computed when it is needed.

Coin change with arbitrary denominations is the standard counter-example showing that greedy cannot be applied without verifying the greedy choice property first. Many coin-change-adjacent problems look amenable to greedy and are not. The surface structure of the algorithm — loop, pick, update — is identical in both cases. Only the proof distinguishes the one that is correct from the one that is convincing.

## Huffman coding: a canonical greedy win

Not all greedy applications are fragile. Some of the most consequential algorithms in computing are provably greedy. Huffman coding is one.

The goal: encode a set of characters using binary strings, with shorter strings for more frequent characters, such that no code is a prefix of another (which would make decoding ambiguous without delimiters).

The greedy algorithm builds the encoding by merging the two least-frequent symbols or subtrees at each step:

1. Start with each character as a leaf node, weighted by frequency.
2. Find the two nodes with the lowest weights.
3. Create a new internal node whose weight is their sum, with the two nodes as its children.
4. Replace the two nodes with the new internal node.
5. Repeat until only one node remains. That node is the root of the encoding tree.

Reading from root to leaf — a `0` for every left branch, a `1` for every right — gives the bit string for each character. The most frequent characters end up closest to the root, with the shortest strings.

The greedy choice at each step — always merge the two lowest-frequency nodes — produces a provably optimal prefix-free code. The proof is not trivial, but the result is: any other construction produces a longer average code length. Huffman coding shows up inside `gzip`, PNG, JPEG, and most other compression formats that move data quietly in the background of daily computing.

Step 2 — find the two nodes with the lowest weights efficiently — uses the data structure we studied for urgency-based ordering: a **priority queue**. Rather than scanning the full list of nodes every time, the priority queue surfaces the minimum-weight node in `O(log n)` time, which keeps the overall algorithm at `O(n log n)`. The greedy structure benefits from the right supporting structure to stay efficient.

## The trade between greedy and dynamic programming

Both approaches require optimal substructure. The choice between them hinges on the greedy choice property.

**Dynamic programming** is the conservative choice. It explores every subproblem, caches results, and guarantees the correct answer for any problem with optimal substructure. The cost is proportional to the number of distinct subproblems and the work to solve each one — `O(n * k)` or similar, depending on the problem, plus an explicit table or memo structure to manage.

**Greedy** is the aggressive choice. It makes one decision per step, needs no cache, and runs in `O(n log n)` or `O(n)` for most natural problems. The cost is proof: you need to verify that the greedy choice property holds, and that verification is problem-specific. Generic greedy is not a technique. Provably correct greedy, for a specific problem, is a technique.

In practice, the pattern looks like this. You encounter an optimization problem. You try the greedy approach because it is simpler and faster. You either prove it works — usually by showing that any deviation from the greedy choice can only make things worse — or you find a counterexample, at which point you fall back to DP.

This back-and-forth is normal. Recognizing when a problem has the greedy choice property is a skill built by working through examples where it does and does not hold. Activity selection looks greedy and is. Coin change with arbitrary denominations looks similar from the outside and is not. The algorithm structure does not tell you which situation you are in. The proof does.

## What the machine is doing

Underneath, greedy algorithms are still the same operations this series has been building up since the beginning: comparisons, array accesses, sorted orderings.

The sort in activity selection uses the same comparison-based sorting we studied when we covered how programs turn comparisons into order. The merge loop in Huffman coding uses a priority queue — the structure we covered for urgency-based ordering — to efficiently find the two minimum-weight nodes at each step without scanning the whole list every time. The sweep in activity selection is a single linear pass over an array, the same kind of pass that makes sets and hash tables fast when membership is all you need to check.

Nothing in a greedy algorithm escapes the fundamental cost model. You are still paying for comparisons and memory accesses. What you are *not* paying for is the branching factor of a recursive DP tree, because the greedy choice property guarantees you will never need to retrace a step. The structure of the problem collapses the tree into a single path, and the algorithm follows it.

That is the real meaning of the greedy bet. Not that work disappears, but that the problem's structure makes revisiting unnecessary.

Next time, we will look at **graph traversal** — how programs walk the graph structures we studied earlier using breadth-first search and depth-first search, visiting nodes in an order that solves useful problems without getting lost or looping forever.
