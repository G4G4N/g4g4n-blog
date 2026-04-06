---
title: "Arrays are how memory scales one layout many times"
date: 2026-04-05 20:14:00 -0400
categories: [skills]
tags: [arrays, memory-layout, indexing, pointers, structs, fundamentals, teaching-track]
summary: "An array is a run of equal-sized elements laid out back-to-back in memory, which lets a program find the nth item by arithmetic instead of by guesswork or prayer."
---

Last time, we looked at alignment and padding: the machine's quiet refusal to lay out every value exactly the way your eyes wish it would. That matters on its own, but it also sets up the next concept cleanly.

What happens when a program does not want one value or one struct, but many values of the same kind?

That is where arrays enter the story.

An **array** is one of the simplest and most important data structures in computing. It is a sequence of elements of the same type, placed in memory one after another according to that type's layout rules. If the element type is one byte wide, the array advances one byte at a time. If the element type is four bytes wide, the array advances four bytes at a time. If the element type is a struct with padding inside it, each element takes up that full padded size, because the machine repeats the actual layout, not the version you drew on a napkin.

That last part is worth slowing down for. An array is not just "a list of things." It is a **repeated memory layout**. Once you understand that, indexing stops looking magical and starts looking like arithmetic with decent posture.

## Start with the smallest case

Suppose we store four one-byte values:

```c
uint8_t scores[4] = {10, 20, 30, 40};
```

If `scores` begins at address `0x1000`, memory might look like this:

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["0x1000: 10"] --> B["0x1001: 20"] --> C["0x1002: 30"] --> D["0x1003: 40"]
  </div>
</figure>

Nothing dramatic is happening. Each element is one byte, so each next element lives one address later. `scores[0]` is at `0x1000`. `scores[1]` is at `0x1001`. `scores[2]` is at `0x1002`.

The machine does not search for the second element. It computes it.

For an array, the address of element `n` follows this rule:

```text
base_address + (n * element_size)
```

That is the whole trick. Much of programming is just this sort of thing wearing a nicer jacket.

## Indexing is offset calculation

Now use a wider type:

```c
uint32_t ports[4] = {80, 443, 22, 53};
```

A `uint32_t` is 4 bytes, so if `ports` begins at `0x2000`, then:

- `ports[0]` starts at `0x2000`
- `ports[1]` starts at `0x2004`
- `ports[2]` starts at `0x2008`
- `ports[3]` starts at `0x200c`

The processor does not care that you emotionally identify these as "the first port" and "the second port." It sees a base address and a stride. That stride is the size of one element.

So when code asks for `ports[2]`, it is really saying:

```text
take the base of the array
+ skip 2 elements
+ each element is 4 bytes
= read at base + 8
```

This matters because arrays give programs a disciplined way to store many similar values while keeping access predictable. Predictability is a major reason arrays are fast. The machine likes arithmetic more than it likes improvisation.

## Arrays are contiguous, and that is the point

An array's power comes from **contiguity**. The elements sit in one uninterrupted region of memory. That gives you several useful properties:

- You can compute any element's address directly.
- You can scan the whole array in order with a simple loop.
- The CPU cache often likes this access pattern, because nearby data tends to arrive together.
- Serialization, parsing, and binary formats become easier when repeated elements have fixed spacing.

This is also why arrays are so common in low-level code, protocol parsing, file formats, cryptography implementations, and performance-sensitive systems work. If memory is a map, arrays are one of the rare neighborhoods where the street numbers make sense.

## Arrays of structs repeat the real struct size

Now the interesting part.

Suppose we define this struct:

```c
struct Entry {
    uint8_t tag;
    uint32_t value;
};
```

From the last lesson, you already know this may not occupy 5 bytes in practice. Because `value` wants 4-byte alignment, the compiler may insert 3 bytes of padding after `tag`, making the struct 8 bytes total:

```text
offset 0: tag      (1 byte)
offset 1-3: padding
offset 4-7: value  (4 bytes)
```

Now create an array:

```c
struct Entry table[3];
```

If `table` begins at `0x3000`, the elements will likely begin at:

- `table[0]` -> `0x3000`
- `table[1]` -> `0x3008`
- `table[2]` -> `0x3010`

Not 5 bytes apart. Not "packed tightly because that feels reasonable." Eight bytes apart, because each element repeats the full layout of `struct Entry`, padding included.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["table[0]\ntag | pad | value\n8 bytes"] --> B["table[1]\ntag | pad | value\n8 bytes"] --> C["table[2]\ntag | pad | value\n8 bytes"]
  </div>
</figure>

This is where people get hurt when they manually parse binary data, cast raw buffers to structs, or assume the shape in source code is the same as the byte-for-byte shape in memory. The machine is repeating the compiled layout, not your intentions. Intentions are not a memory model.

## The name of an array is closely tied to its first element

Arrays also connect naturally to pointers.

In many expressions in C, the name of an array behaves like a pointer to its first element. If `ports` is an array, then `ports` often acts like "the address of `ports[0]`." That is why pointer arithmetic and array indexing are so closely related.

These two expressions describe the same element:

```c
ports[2]
*(ports + 2)
```

Why? Because `ports + 2` means "start at the base address, then move forward by two elements." Not two bytes. Two elements. The type determines the stride.

This is elegant, fast, and responsible for a large portion of both C's power and C's criminal record.

## Arrays do not remember their own length

Now for an operationally important detail: an array is a layout, not a self-aware object.

In low-level languages, memory does not usually store a little note saying, "hello, I contain exactly 4 elements, please behave accordingly." If you step past the end of the array, the hardware does not ring a bell and call security. You may read unrelated data, corrupt adjacent memory, or create a vulnerability with all the dignity of a person walking through a clearly labeled wall.

Consider:

```c
int nums[3] = {7, 8, 9};
int x = nums[5];
```

The syntax is legal enough to compile in many cases. The problem is semantic: `nums[5]` refers to memory beyond the array's valid region. That is an out-of-bounds access. Sometimes it crashes. Sometimes it leaks data. Sometimes it appears to work, which is often the most dangerous outcome because it trains people to trust undefined behavior. The machine remembers everything except your optimism.

## Why arrays matter beyond toy examples

Arrays show up everywhere once you know how to see them.

A string in memory is often an array of characters. A packet payload is often treated as an array of bytes. An image buffer is often an array of pixels. A process's argument list, a page table, a routing table, a block of cryptographic key material, a list of file descriptors, and a chunk of sensor readings can all reduce to repeated elements laid out contiguously.

Even higher-level data structures are often built on arrays underneath. Dynamic arrays, vectors, slices, strings, matrices, heaps in the algorithmic sense, and many hash table implementations rely on the same basic fact: if you can place repeated elements in a predictable contiguous layout, you can build more sophisticated behavior on top.

So arrays are not just a beginner topic. They are one of the fundamental ways the machine turns "many things of the same shape" into something software can navigate efficiently.

## The real mental model

If you want the durable version of this lesson, keep this model:

An array is not a vague collection. It is:

- one base address
- one element layout
- one repeated stride
- one indexing rule based on offset arithmetic

Once that clicks, a lot of later ideas become easier. Iteration becomes controlled address movement. Pointer arithmetic becomes less spooky. Buffer overflows become less mysterious. Arrays of structs, strings, packet fields, and file parsing all start to look like variations of the same underlying memory story.

That is progress. Also, it is how you start seeing why memory bugs are so common: the abstractions are friendly, but the underlying rules are still made of addresses, sizes, and consequences.

Next time, we will build on arrays by looking at **strings and character buffers**, where repeated bytes start pretending to be human language and the boundary between "text" and "raw memory" becomes much thinner than most people would prefer.
