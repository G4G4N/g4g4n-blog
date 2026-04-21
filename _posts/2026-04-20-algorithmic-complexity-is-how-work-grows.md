---
title: "Algorithmic complexity is how work grows"
date: 2026-04-20 20:00:00 -0400
categories: [skills]
tags: [algorithmic-complexity, big-o, algorithms, performance, arrays, binary-search, fundamentals, teaching-track]
summary: "Algorithmic complexity describes how a program's work grows as the input grows, giving us a practical way to compare approaches before production traffic turns small inefficiencies into expensive alarms."
---

Last time, we used binary search to turn a sorted array into an interrogation room with excellent lighting. One comparison with the middle value let the program discard half the remaining possibilities. The machine did not become clever in the human sense. It simply used a stronger promise about the data.

That lesson ended with a bigger question hiding in plain sight:

```text
How do we describe the way work grows?
```

Not how long one run took on one laptop. Not whether the demo felt snappy while the fan stayed quiet. Those are measurements, and measurements matter, but they are not the shape of the problem. A program can be fast on ten items and miserable on ten million. Plenty of production incidents began as a function that seemed harmless because nobody fed it enough reality.

The tool programmers use for this conversation is **algorithmic complexity**. Most often, you will meet it through **Big O notation**: `O(1)`, `O(n)`, `O(log n)`, `O(n^2)`, and friends. The notation looks like math wearing a conference badge, but the core idea is practical:

```text
As the input gets bigger, how does the amount of work change?
```

That is all we need to begin.

## Start with the machine problem

Suppose a program receives a list of login events and needs to answer a simple question:

```text
Did user "alice" log in?
```

If the events are stored in an unsorted array, the direct approach is to check each event from left to right:

```text
event[0]? no
event[1]? no
event[2]? no
...
event[n - 1]? maybe
```

For one hundred events, this is fine. For one million events, it may still be fine if the operation is rare and cheap. For one million events on every request behind an authentication gateway, congratulations, you have invented a denial-of-service assistive device.

The important part is not the exact number of milliseconds. It is the relationship:

```text
twice as many events means roughly twice as many checks
```

That growth pattern is called **linear time**, written as `O(n)`. The `n` means the size of the input. If there are `n` events, the worst case may require checking about `n` events.

Big O ignores the machine's mood, the CPU model, the language runtime, and the exact cost of each comparison. That sounds rude, but it is useful rudeness. It strips away details so we can see the growth pattern.

## Constant time: work that does not grow with the list

Some operations do not care how many items are in the collection.

Reading the first item of an array is one example:

```text
first = events[0]
```

Whether the array has 10 items or 10 million, accessing index `0` is still one address calculation and one read, assuming the array is already in memory. The program does not inspect the other elements. It does not send apology emails to indexes `1` through `9,999,999`. It just computes where the first item lives and reads it.

That is **constant time**, written as `O(1)`.

The `1` does not mean the operation literally takes one CPU instruction. It means the amount of work does not grow as the input grows. The constant might be small or large. Opening a safe with one absurdly expensive biometric scan could still be `O(1)` relative to the number of records in an array. Big O describes growth, not comfort.

Constant time is powerful because it stays predictable under scale. If a request path can answer a question with a fixed amount of work, it is easier to reason about capacity and harder for an attacker to inflate cost just by increasing input size.

But do not let `O(1)` become a magic amulet. A constant-time operation can still be too slow, too memory-hungry, or too leaky if it branches on secrets. Complexity is one lens. Good engineering keeps both eyes open.

## Linear time: one pass over the input

Linear time, `O(n)`, means work grows in proportion to input size.

Searching an unsorted list is the classic example:

```text
for each event in events:
    if event.user == "alice":
        return true
return false
```

In the best case, Alice is first. In the worst case, Alice is absent or last. Complexity usually focuses on the worst case because systems do not get to require attackers, users, or upstream services to provide convenient data. If your code is only fast when the input is polite, the input will eventually develop an attitude.

Linear work is not bad by default. Many good programs read input once, validate it, transform it, or stream it onward. A single pass is often exactly what you want. The danger appears when a linear operation hides inside another repeated operation, or when the input can become much larger than the original author imagined.

For example, validating every uploaded username once is probably fine:

```text
check n usernames -> O(n)
```

Checking every username against every other username to find duplicates is a different animal:

```text
for each username:
    compare it with every other username
```

That is where the curve bends.

## Quadratic time: every item meets every item

An algorithm is **quadratic**, `O(n^2)`, when doubling the input can roughly quadruple the work.

The simplest shape is a nested loop:

```text
for each a in users:
    for each b in users:
        compare a and b
```

If there are 10 users, that is around 100 comparisons. If there are 1,000 users, that is around 1,000,000 comparisons. The code only gained one extra zero in the input, then acted like it found a coupon for three more zeros at checkout.

Sometimes quadratic work is acceptable. If `n` is permanently tiny, a simple nested loop may be clearer than a more elaborate structure. A list of five allowed HTTP methods does not need a research paper. But when `n` is user-controlled, network-controlled, file-controlled, or otherwise reality-controlled, quadratic behavior deserves suspicion.

Consider duplicate detection:

```text
names = ["alice", "bob", "charlie", "bob"]
```

A quadratic approach compares every name with every later name:

```text
alice vs bob
alice vs charlie
alice vs bob
bob vs charlie
bob vs bob
charlie vs bob
```

That works. It is also wasteful as the list grows.

A better approach is to remember what we have already seen:

```text
seen = empty set

for each name in names:
    if name is in seen:
        duplicate found
    add name to seen
```

With a good set implementation, each membership check is usually treated as roughly constant time. The whole operation becomes one pass: `O(n)`. We traded memory for speed, which is a very common bargain in computing. The machine is full of such bargains. Some are wise. Some become incident reports with timestamps.

## Logarithmic time: cutting the problem down

Binary search gave us **logarithmic time**, written as `O(log n)`.

The practical meaning is:

```text
When the input doubles, the work increases by about one step.
```

That is a strange and beautiful growth pattern. Searching a sorted array of 1,000,000 items takes about 20 comparisons. Searching 2,000,000 items takes about 21. The input doubled, but the work barely flinched.

This happens because each step discards a fraction of the remaining problem:

```text
1,000,000
500,000
250,000
125,000
62,500
...
```

Logarithmic algorithms usually rely on structure. Binary search needs sorted order. Balanced trees keep data arranged so each comparison chooses a branch. Indexes in databases do related work: they store extra structure so lookup does not mean scanning the whole table like a confused flashlight.

The security lesson is familiar: structure is a control. If a service can reject, locate, or classify input using logarithmic or constant-ish work, it is harder to exhaust with large but boring data. If the same service repeatedly performs unbounded linear or quadratic work on attacker-supplied input, it may be offering free CPU futures to the public. The public is not known for restraint.

## A small growth map

The exact timings depend on hardware and implementation, but the growth patterns are different enough to see with toy numbers:

```text
n = input size

Operation type       n = 10      n = 1,000      n = 1,000,000
----------------------------------------------------------------
O(1)                 1           1              1
O(log n)             ~4          ~10            ~20
O(n)                 10          1,000          1,000,000
O(n^2)               100         1,000,000      1,000,000,000,000
```

This table is not a stopwatch. It is a warning label.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["input grows"] --> B["O(1): fixed work"]
    A --> C["O(log n): cut the problem down"]
    A --> D["O(n): scan once"]
    A --> E["O(n^2): compare pairs"]
    B --> F["predictable lookup"]
    C --> G["binary search, trees, indexes"]
    D --> H["validation, filtering, streaming"]
    E --> I["nested loops, pair checks, risk zone"]
  </div>
  <figcaption>Complexity names the growth pattern, not the exact runtime on one machine.</figcaption>
</figure>

If you remember nothing else, remember the shape:

```text
O(1)      does not grow with input
O(log n) grows slowly by cutting the problem
O(n)      grows directly with input
O(n^2)    grows by pairing items with items
```

These are not moral categories. `O(n)` can be excellent. `O(1)` can be bloated. `O(n^2)` can be perfectly fine for five things. Complexity is not a substitute for judgment. It is how judgment gets a ruler.

## Big O drops details on purpose

When we say a loop is `O(n)`, we are not claiming every input of size `n` takes exactly `n` operations. We are describing the dominant growth behavior as `n` gets large.

That means Big O intentionally ignores constant factors:

```text
5n      -> O(n)
100n    -> O(n)
```

It also ignores smaller terms:

```text
n^2 + n + 40 -> O(n^2)
```

Why? Because as `n` grows, the largest term dominates the shape. At small sizes, `40` may matter. At huge sizes, `n^2` is the part setting the building on fire.

This is where people sometimes misuse Big O. They learn to ignore constants, then ignore reality. Do not do that. Constants matter in real systems. Memory access patterns matter. Cache behavior matters. Network calls matter. Disk seeks matter. A supposedly better complexity class can lose on small inputs because its setup cost is high.

Big O is not a benchmark. It is a map of how cost scales. Benchmarks tell you what happened on a particular road with a particular vehicle and weather. Complexity tells you whether the road becomes a cliff when the input grows.

You need both.

## Complexity bugs become security bugs

Performance and security are not separate planets. If an attacker can make your program do too much work, performance becomes availability, and availability is a security property.

Consider a parser that accepts a long input string. If each new character causes the parser to rescan all previous characters, total work can become quadratic. A small input looks fine. A large crafted input burns CPU. This pattern shows up in regular expression backtracking, naive parsers, poorly bounded decompression, inefficient JSON handling, and all sorts of "it passed unit tests" software archaeology.

The attacker does not need code execution if they can buy your compute for the price of a request.

Complexity analysis helps you ask better questions:

```text
What input controls n?
Is n bounded?
Is a linear scan inside another loop?
Can a malicious user force the worst case?
Does this data structure preserve the promise the algorithm expects?
```

Those questions are not academic. They are how you notice that a harmless-looking endpoint does a database lookup inside a loop, or that a deduplication step compares every uploaded item with every other uploaded item, or that a "quick validation" regex has the temperament of wet cardboard under pressure.

The machine only performs the steps we gave it. Complexity is how we count the steps before someone else does.

## The abstraction is a budget conversation

Algorithmic complexity is not about memorizing symbols so you can intimidate a whiteboard. It is about seeing the cost model behind code.

An array access can be `O(1)` because the address calculation is direct. A scan is `O(n)` because the program may inspect every item. Binary search is `O(log n)` because sorted order lets each comparison eliminate half the remaining range. A nested pair comparison is often `O(n^2)` because each item interacts with many others.

Underneath every notation is the same machine story:

```text
addresses read
comparisons made
branches taken
memory written
work repeated as input grows
```

That is the point of learning this from first principles. The abstraction is useful only because it compresses real mechanical behavior. Once you understand the behavior, the symbols stop pretending to be magic and start acting like labels on a circuit breaker panel.

Next time, we will use this cost model to study **hash tables**: how programs trade extra memory and a good hash function for fast lookup, and why the phrase "constant time" always deserves a small security footnote.
