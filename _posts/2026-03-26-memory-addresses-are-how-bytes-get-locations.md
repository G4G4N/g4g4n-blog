---
title: "Memory addresses are how bytes get locations"
date: 2026-03-26 20:00:00 -0400
categories: [skills]
tags: [memory, addresses, offsets, bytes, fundamentals, teaching-track]
summary: "Bytes only become useful at scale when the machine can locate them, revisit them, and measure distance between them, which is what memory addresses and offsets are for."
---

So far, we have built upward carefully. First the machine could preserve state. Then those states became bits. Bits were grouped into bytes. Hex gave humans a readable way to inspect byte patterns without developing personal grievances against binary.

Now we need to answer a new question: once a computer has a pile of bytes, how does it know where any particular byte lives?

That is where memory addresses enter the story.

A memory address is a location label. It tells the machine where a particular byte can be found. Not what the byte means. Not whether the byte is text, an integer, part of an image, or the beginning of a bug report you are about to regret. Just where it is.

This matters because memory is not one giant philosophical soup. It is organized storage. If a program wants to read data again later, it needs a way to point back to the same place. If it wants the next byte after that, it needs a way to describe adjacency. If it wants a whole structure, it needs a way to measure how far each part is from the beginning. Computing gets powerful the moment data stops being "some bytes somewhere" and starts being "these bytes at this location."

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["Memory address 0x1000"] --> B["Byte 0x48"]
    C["Memory address 0x1001"] --> D["Byte 0x69"]
    E["Memory address 0x1002"] --> F["Byte 0x21"]
    G["Offset +0"] --> A
    H["Offset +1"] --> C
    I["Offset +2"] --> E
  </div>
  <figcaption>An address names a byte's location. An offset measures distance from a known starting point.</figcaption>
</figure>

The simplest mental model is to imagine memory as a very long row of numbered mailboxes. Each mailbox can hold a byte. The number on the mailbox is the address. The contents inside are the data. If mailbox `0x1000` contains `0x48`, that means the byte value `0x48` is stored at address `0x1000`. If the next mailbox, `0x1001`, contains `0x69`, then that byte sits immediately after it in memory. The numbers help the machine navigate. The contents are a separate question.

That distinction is worth protecting because beginners often fuse value and location together. Suppose you see this:

```text
Address    Byte
0x1000     0x48
0x1001     0x69
0x1002     0x21
```

The addresses are `0x1000`, `0x1001`, and `0x1002`.

The stored values are `0x48`, `0x69`, and `0x21`.

If you interpret those bytes as ASCII, they spell `Hi!`

The machine cares about both facts, but for different reasons. The values tell it what data is present. The addresses tell it where to fetch that data. Confusing the two is like saying your apartment number and your furniture are basically the same because they are both involved in dinner. They are not.

Addresses usually increase one byte at a time because memory is byte-addressable on modern systems. That phrase sounds more dramatic than it is. It just means each distinct address refers to one byte. So if one byte is at `0x1000`, the next byte is at `0x1001`, then `0x1002`, and so on. This is why hex is so convenient: it makes address arithmetic readable while preserving the machine's byte-oriented structure.

Now we can introduce the idea that makes real memory layouts manageable: offsets.

An offset is a distance from a starting point. If a structure begins at address `0x2000`, then:

- offset `+0` refers to address `0x2000`
- offset `+1` refers to address `0x2001`
- offset `+2` refers to address `0x2002`
- offset `+16` refers to address `0x2010`

Offsets matter because software often reasons about memory relative to a base location rather than by memorizing every absolute address. That is much saner. A file parser might say, "read four bytes starting at offset 8." A CPU might compute an address by taking the starting address of an array and adding an index. A debugger might show you a buffer beginning at one address today and a different address tomorrow, while the internal layout stays exactly the same. Absolute addresses can move. Relative layout is often what the program actually depends on.

Consider this tiny record:

```text
Base address: 0x3000

Offset   Address   Byte
+0       0x3000    0x41
+1       0x3001    0x42
+2       0x3002    0x43
+3       0x3003    0x44
```

If those bytes are ASCII, the record contains `ABCD`.

If a program wants the third byte in that record, it does not need to emotionally bond with `0x3002`. It can compute:

`base address + offset = 0x3000 + 2 = 0x3002`

That is the basic pattern behind array access, parsing, buffer handling, and a suspicious amount of low-level debugging. You start somewhere known, then move by a measured distance.

This is also why out-of-bounds bugs are so common and so dangerous. If software miscalculates an offset, it does not drift into a polite conceptual error. It reads or writes the wrong location. Ask for `+4` when only offsets `+0` through `+3` are valid, and you are no longer operating inside the intended object. You are trespassing in adjacent memory with the confidence of a process that has never experienced consequences.

Here is a simple example. Imagine a four-byte buffer beginning at `0x4000`:

```text
0x4000  0x41
0x4001  0x42
0x4002  0x43
0x4003  0x44
```

Valid offsets are `0`, `1`, `2`, and `3`.

If the program tries to read offset `4`, it lands on `0x4004`, which is outside the buffer. Maybe that next byte belongs to another variable. Maybe it is unused padding. Maybe it is part of metadata the program really should not be touching. This is one of the reasons memory safety is a real engineering problem and not just a stern vibe from the compiler.

Security work runs into this constantly. Buffer overflows, out-of-bounds reads, use-after-free bugs, parser mistakes, and type confusion all become easier to understand once you see systems as "values at locations" rather than a magical sea of variables. The bug is often not that the bytes are strange. The bug is that the software reads the wrong bytes, writes to the wrong bytes, or keeps trusting an address after the meaning of that location has changed. Underneath the drama, the machine is still doing boring address math with terrifying commitment.

There is another subtle point here: addresses do not automatically reveal meaning. Suppose address `0x5000` holds the byte `0x2A`. Is that the number 42? An asterisk character in ASCII? Part of a longer integer? A piece of machine code? A color channel? You cannot know from the address alone, and often not from a single byte alone either. Location tells you where. Interpretation still depends on context. The machine remains ruthlessly literal about this.

That is the narrative thread worth keeping from the entire track so far. Bits gave us state. Bytes gave us chunking. Hex gave us readability. Addresses give us placement. Offsets give us movement. Once those pieces are in your head at the same time, memory stops looking like mystical internal fog and starts looking like an indexed map of byte-sized storage.

And that map is where much of real computing lives. Variables, arrays, stack frames, packet buffers, file parsers, image decoders, cryptographic state, process memory, and exploit primitives all rely on the same underlying truth: the machine stores bytes at addresses, and programs survive only if they keep their location math honest.

That is not glamorous, but it is the sort of boring precision that keeps systems functioning and incidents shorter. In infosec, that qualifies as romance.

## What comes next

Now that bytes have locations, the next lesson is how multi-byte values are arranged across those locations. In other words: endianness, or why the same bytes can describe the same value while still appearing backward enough to ruin somebody's afternoon.
