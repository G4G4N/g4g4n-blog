---
title: "Alignment and padding are why memory layouts have invisible bytes"
date: 2026-04-04 20:10:00 -0400
categories: [skills]
tags: [alignment, padding, structs, memory-layout, cpu, fundamentals, teaching-track]
summary: "A struct's fields do not always sit tightly together, because processors and compilers often prefer values to begin on particular boundaries, and the extra space that creates is called padding."
---

Last time, we ended with a small betrayal: a struct looks like a tidy sequence of fields, but the actual bytes in memory do not always sit back-to-back the way your eyeballs expect. Sometimes the compiler inserts empty bytes between fields or at the end of the struct. Those bytes are **padding**, and the rule that motivates them is **alignment**.

This is one of those ideas that sounds fussy right up until it breaks something real.

If you are parsing a binary file, talking to a network protocol, reverse engineering a crash dump, writing kernel or embedded code, or explaining how an information leak happened, alignment and padding stop being compiler trivia and become machine law. The machine is not being dramatic. It is trying to move data efficiently and predictably. Humans are usually the ones acting surprised.

## Start with the question the CPU asks

Suppose you have a 4-byte integer. In raw memory, it occupies four consecutive bytes. Fine. But where should those four bytes begin?

Many processors prefer certain values to start at addresses that are multiples of their size or some related boundary. A 4-byte value is often happiest at an address divisible by 4. An 8-byte value is often happiest at an address divisible by 8.

That preference is **alignment**.

So if an `int` is 4 bytes wide, these addresses are commonly aligned for it:

- `0x1000`
- `0x1004`
- `0x1008`

And these are commonly misaligned:

- `0x1001`
- `0x1002`
- `0x1003`

Why does the CPU care? Because hardware likes regularity. Fetching a value that starts on a natural boundary is often simpler, faster, or both. Misaligned accesses may still work on some architectures, but they can cost extra cycles, require multiple memory operations, or trap entirely on stricter systems. The processor is not being precious. It is enforcing the same principle we keep seeing: order first, convenience second.

## A struct that looks smaller than it is

Consider this C struct:

```c
struct Example {
    char tag;
    int value;
};
```

If you just count field sizes, you might expect this:

- `char tag` = 1 byte
- `int value` = 4 bytes
- total = 5 bytes

That is the beginner answer. The machine answer is usually different.

If `value` wants 4-byte alignment, the compiler may lay it out like this:

```text
Offset   Contents
0        tag      (1 byte)
1        padding  (1 byte)
2        padding  (1 byte)
3        padding  (1 byte)
4        value    (4 bytes)
```

Now the struct occupies 8 bytes, not 5.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["struct Example base"] --> B["+0: tag (1 byte)"]
    A --> C["+1 to +3: padding"]
    A --> D["+4 to +7: value (4 bytes)"]
  </div>
  <figcaption>The compiler may insert invisible bytes so a larger field begins at an aligned offset.</figcaption>
</figure>

Nothing mystical happened. The compiler looked at the layout, saw that `value` would otherwise begin at offset `1`, and inserted 3 padding bytes so `value` could begin at offset `4`.

That is the key mental model:

**Padding is empty space added so later fields can start where the hardware expects them to start.**

## Alignment is about addresses, padding is about layout

These two terms are related but not identical.

Alignment is the rule or preference:

- this type should begin on a boundary like 2, 4, or 8 bytes

Padding is the consequence inside a struct:

- the compiler inserts unused bytes to make the next field satisfy that rule

It helps to think of alignment as the policy and padding as the paperwork.

## A concrete walk through

Imagine `struct Example` begins at address `0x2000`.

Then the layout might be:

```text
Address   Meaning
0x2000    tag
0x2001    padding
0x2002    padding
0x2003    padding
0x2004    value byte 0
0x2005    value byte 1
0x2006    value byte 2
0x2007    value byte 3
```

Now `value` begins at `0x2004`, which is divisible by 4. The machine relaxes slightly and continues with its day.

If the compiler had placed `value` immediately after `tag`, then `value` would begin at `0x2001`, which is often an awkward address for a 4-byte integer. On some CPUs that means a performance penalty. On others, especially in stricter low-level environments, that can become a fault.

## Field order changes the shape

Here is where layout starts feeling less like arithmetic and more like negotiation.

Compare these two structs:

```c
struct A {
    char tag;
    int value;
    short code;
};

struct B {
    int value;
    short code;
    char tag;
};
```

Both contain the same kinds of fields. They do not necessarily have the same size.

One plausible layout for `struct A` is:

```text
Offset   Contents
0        tag      (1)
1..3     padding  (3)
4..7     value    (4)
8..9     code     (2)
10..11   padding  (2)
```

Total: 12 bytes

One plausible layout for `struct B` is:

```text
Offset   Contents
0..3     value    (4)
4..5     code     (2)
6        tag      (1)
7        padding  (1)
```

Total: 8 bytes

Same information. Different field order. Different amount of padding.

This is why systems programmers often group wider fields first when layout size matters. It does not change the meaning of the data, but it can reduce wasted space and produce a more compact layout. You are not tricking the compiler. You are making its job easier.

## There can be padding at the end too

Beginners often notice padding between fields and miss the padding at the end of a struct.

Why would the compiler pad the end? Because arrays exist, and arrays are mercilessly repetitive.

If one `struct Example` is 8 bytes, then an array of them can place each element at an address that keeps the internal `int value` aligned in every element:

```text
element 0 starts at 0x3000
element 1 starts at 0x3008
element 2 starts at 0x3010
```

That trailing padding means every new struct instance in the array begins on a suitable boundary. The compiler is not wasting space for sport. It is preserving the alignment contract repeatedly.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["Example[0] at 0x3000"] --> B["8 bytes total"]
    B --> C["Example[1] at 0x3008"]
    C --> D["8 bytes total"]
    D --> E["Example[2] at 0x3010"]
  </div>
  <figcaption>Trailing padding lets each struct in an array start at a correctly aligned address.</figcaption>
</figure>

This is also your preview for the next lesson: arrays only behave cleanly because element size and layout are predictable. The machine never tires of turning one rule into many repeated obligations.

## Why security people care so much

Padding bytes are not fields. They are just bytes occupying space in an object layout. That becomes interesting, and sometimes ugly, when code assumes those bytes are harmless or zeroed.

Imagine a struct is copied across a trust boundary:

```c
struct Record {
    char status;
    int id;
};
```

If the program initializes `status` and `id` but never explicitly clears the padding bytes, those padding bytes may contain stale stack or heap data left over from earlier activity. If the whole struct is then serialized, logged, returned to user space, or sent over the network as raw bytes, the program may leak information it never intended to expose.

That is not hypothetical low-level melodrama. Uninitialized padding has contributed to real information disclosure bugs because the programmer thought "I set the fields" was the same as "I controlled every byte." It is not.

At the machine level, the safer statement is:

**If bytes exist, bytes matter.**

The compiler inserted them. The allocator stores them. The attacker reads them if you hand them over.

## Why naive binary parsing fails

Another classic mistake is assuming a struct's in-memory layout is automatically a valid file format or network protocol format.

That assumption breaks because:

- compilers may pad fields differently
- architectures may use different alignment rules
- endianness can differ
- compiler options like packing can change layout

So when two systems exchange binary data, they need an explicit, shared format. If you simply dump a native C struct to disk and expect every future reader to agree, you are outsourcing correctness to coincidence, which is an expensive hobby.

This is why protocol designers define exact field sizes and byte order, and why reverse engineers care about offsets so much. Layout is part of the contract, not an implementation detail you can wave away with optimism.

## What about packed structs?

Some compilers let you request packed layouts that minimize or remove padding. That can be useful when mapping onto an externally defined binary format.

But packed data is not free. It may create misaligned accesses, slower code, or architecture-specific hazards. Packed layout is a tool, not a moral victory. If the hardware wants alignment and you deny it, the bill still arrives somewhere.

The disciplined approach is:

- use natural layout when you want efficient in-memory access
- use explicit serialization when you need portable binary formats
- use packed layouts only when you truly need them and understand the tradeoff

That is less glamorous than pretending one struct definition should solve every problem. It is also how fewer incidents get written.

## The practical mental model

If you want one durable model, use this:

Alignment is the rule that certain values should start on certain boundaries. Padding is the extra space inserted so those rules hold inside real object layouts.

That explains why `sizeof(struct)` can exceed the sum of its fields. It explains why field order can change object size. It explains why arrays of structs need trailing padding. And it explains why invisible bytes sometimes become very visible during debugging, exploitation, or incident response.

Structs taught us that one base address can turn into predictable field offsets. Alignment and padding add the next layer of realism: those offsets are shaped not just by field order, but by the machine's performance and access rules.

Next time, we will cash in on that predictability and look directly at **arrays**, where one element layout gets repeated over and over until pointer arithmetic stops seeming like a strange ritual and starts looking inevitable.
