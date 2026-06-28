---
title: "Dynamic programming is how recursion stops paying for the same answer twice"
date: 2026-06-28 13:28:00 -0400
categories: [skills]
tags: [dynamic-programming, memoization, recursion, algorithmic-complexity, hash-tables, arrays, fundamentals, teaching-track]
summary: "Dynamic programming takes a recursive function that keeps re-solving the same subproblems and gives it a memory, turning exponential blowup into work that grows only as fast as the number of distinct subproblems."
---

Last time, we used algorithmic complexity to put a price tag on work as input grows: `O(1)`, `O(n)`, `O(log n)`, `O(n^2)`, and the rest of that family. That gave us a vocabulary for asking whether a piece of code will be fine at scale or whether it is quietly building a denial-of-service feature it never meant to ship.

Today we point that vocabulary at recursion, because recursion has a specific, very common way of failing the complexity test: it solves the same subproblem over and over, as if it has never met itself before.

## Start with a function that looks completely innocent

Here is the textbook recursive definition of the Fibonacci sequence, where each number is the sum of the two before it:

```c
int fib(int n) {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}
```

This is a direct translation of the recursive case we learned about last time: a base case (`n <= 1`), and a recursive case that reduces the problem and calls itself again. It reads cleanly. It matches the math. It is also, in a very specific and avoidable way, terrible.

Call `fib(5)` and watch what actually happens underneath:

```text
fib(5)
  fib(4)
    fib(3)
      fib(2)
        fib(1)
        fib(0)
      fib(1)
    fib(2)
      fib(1)
      fib(0)
  fib(3)
    fib(2)
      fib(1)
      fib(0)
    fib(1)
```

`fib(3)` gets computed twice. `fib(2)` gets computed three times. `fib(1)` and `fib(0)` get computed five times each. Nothing in this tree is wrong, exactly. Every call is doing legitimate, correct work. The problem is that the same legitimate, correct work keeps happening for inputs the function has already fully solved.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["fib(5)"] --> B["fib(4)"]
    A --> C["fib(3)"]
    B --> D["fib(3)"]
    B --> E["fib(2)"]
    C --> F["fib(2)"]
    C --> G["fib(1)"]
    D --> H["fib(2)"]
    D --> I["fib(1)"]
  </div>
  <figcaption>fib(3) and fib(2) each appear more than once in the same call tree, computed from scratch every time.</figcaption>
</figure>

That repetition is not a rounding error. It compounds. The number of calls roughly doubles with each increase in `n`, which makes naive `fib` an `O(2^n)` function for a problem that does not need to be anywhere near that expensive. `fib(40)` already takes long enough to notice. `fib(50)` takes long enough to make you check whether the process hung.

## Two properties make this fixable

Not every slow recursive function can be rescued this cleanly. The Fibonacci recursion happens to have two properties that make it a perfect candidate for the fix we are about to apply:

- **Overlapping subproblems** — the same smaller inputs (`fib(3)`, `fib(2)`, and so on) get requested repeatedly across different branches of the recursion.
- **Optimal substructure** — the answer to a larger problem can be built directly from the answers to its smaller subproblems, with no need to reconsider choices already made.

When both properties hold, you are looking at a problem suited to **dynamic programming**: solve each distinct subproblem once, remember the answer, and reuse it instead of recomputing it. The name is historical and unhelpful — there is nothing dynamic about it in the everyday sense, and it has little to do with "programming" in the modern sense of writing code. Treat it as a label, not a description.

## Memoization: give recursion a memory

The smallest possible fix keeps the recursive structure exactly as it is and adds one new idea: before doing the work, check whether you have already done it.

```c
int memo[100];
bool computed[100];

int fib(int n) {
    if (n <= 1) {
        return n;
    }
    if (computed[n]) {
        return memo[n];
    }

    int result = fib(n - 1) + fib(n - 2);

    memo[n] = result;
    computed[n] = true;
    return result;
}
```

This is called **memoization**: caching the result of a function call, keyed by its input, so that a repeated call with the same input returns the stored answer instead of redoing the work. Here the cache is a plain array, because the key is a small non-negative integer and an array gives `O(1)` access by index. If the inputs were less tidy — strings, tuples, or anything not conveniently indexable — the natural cache is the data structure we already met for exactly this job: a **hash table**, keyed by the input and storing the computed result.

With memoization in place, the call tree collapses. `fib(3)` gets computed once. Every subsequent request for `fib(3)` is a cache hit, not a recursive descent. The function still calls itself, still has a base case, still has a recursive case — every rule from the recursion lesson still holds. It just refuses to pay full price for an answer it has already purchased.

The complexity change is dramatic: `O(2^n)` collapses to `O(n)`, because there are only `n` distinct subproblems, and each one is now solved exactly once.

## Tabulation: build the answer bottom-up instead

Memoization is recursion with a cache bolted on. **Tabulation** is the other common shape: drop the recursion entirely and build up the answer iteratively, starting from the base cases.

```c
int fib(int n) {
    if (n <= 1) {
        return n;
    }

    int table[n + 1];
    table[0] = 0;
    table[1] = 1;

    for (int i = 2; i <= n; i++) {
        table[i] = table[i - 1] + table[i - 2];
    }

    return table[n];
}
```

This fills an array left to right, the same way arrays scale one layout many times, and the same way sorting turned repeated comparisons into a single ordered pass. Each entry is computed exactly once, in an order that guarantees its dependencies (`table[i - 1]` and `table[i - 2]`) are already filled in by the time it is needed. No call stack grows. No function calls itself at all.

Tabulation and memoization solve the same problem and have the same `O(n)` time complexity here. The difference is direction and mechanism: memoization starts from the question you actually care about and lazily fills in only the subproblems that question turns out to need, using the call stack to track where it is. Tabulation starts from the base cases and works forward unconditionally, using an explicit loop and an explicit table instead of recursive descent. Memoization can be cheaper when only a fraction of possible subproblems are ever requested. Tabulation avoids recursion overhead and stack depth limits entirely, which matters once `n` gets large enough that a recursive call chain risks the same kind of stack exhaustion that motivated the original stack lesson.

## The trade you are actually making

Every version of this technique trades memory for time. Plain recursive `fib` uses almost no extra memory but recomputes constantly. Memoized and tabulated `fib` use `O(n)` extra memory to store every subproblem's answer exactly once, in exchange for never solving the same subproblem twice.

This is the same trade hash tables make when they spend extra bucket space to turn a linear scan into a near-constant-time lookup. Dynamic programming is that same idea applied across the timeline of a single computation instead of across a static collection: spend a little space remembering the past so the present does not have to relitigate it.

It is also worth being honest about the failure mode on the other side. A cache with no bound on its key space is not automatically a win. If the subproblems are indexed by something an attacker controls — an arbitrary string, an unbounded user-supplied size, a deeply nested structure — then "remember every answer" can turn into "allocate unbounded memory for an attacker-chosen number of distinct keys," which is a memory-exhaustion problem wearing an optimization costume. The fix that rescues you from one denial-of-service shape (exponential recomputation) can introduce another (unbounded cache growth) if the subproblem space is not actually bounded by something you control. Complexity analysis from last time is exactly the tool that should catch this: ask what controls the number of distinct subproblems, the same way you would ask what controls `n` in any other cost model.

## What the machine has learned

Dynamic programming is not a new kind of machine operation. Underneath, it is still recursion or iteration, still arrays or hash tables, still the same comparisons and address arithmetic we have been building up this entire series. What changes is a single discipline: notice when you are about to solve a problem you have already solved, and look it up instead.

That discipline turns out to be one of the highest-leverage ideas in this whole series, because "the same subproblem, requested again" is a pattern that shows up far beyond textbook Fibonacci — in parsing, in pathfinding, in string comparison, in scheduling, anywhere a problem can be broken into smaller versions of itself that overlap rather than staying neatly separate.

Next time, we will look at **greedy algorithms**, which take the opposite bet: instead of exploring and caching every subproblem's optimal answer, a greedy algorithm makes one locally best choice at each step and never looks back. Sometimes that gamble pays off exactly as well as the exhaustive version, for a fraction of the cost. Sometimes it does not, and the gap between those two outcomes is where some of the most useful algorithmic judgment in this entire series lives.
