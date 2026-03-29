---
title: "Instructions are how a processor turns bytes into work"
date: 2026-03-28 09:00:00 -0400
categories: [skills]
tags: [cpu, instructions, registers, fetch-decode-execute, fundamentals, teaching-track]
summary: "Once values live in memory, the next question is how the processor reads some of those bytes as instructions, uses registers as working state, and repeatedly turns stored patterns into action."
---

We now have enough pieces on the table to ask the dangerous question: when does the machine actually *do* something?

Bits gave us stable state. Bytes gave us standard chunks. Hex gave humans a way to read those chunks without becoming adversarial toward the number system. Addresses gave bytes locations. Endianness gave multi-byte values an ordering rule.

All of that explains how data can exist.

It does not yet explain execution.

A computer is not useful just because memory contains bytes. A warehouse full of labeled boxes is still not a shipping operation. At some point, something has to read those bytes, interpret some of them as commands, move data around, perform arithmetic, and decide what happens next.

That something is the processor.

More specifically, the processor repeatedly performs a simple loop: fetch an instruction, decode what it means, execute it, then move on. This is the **fetch-decode-execute cycle**. It is one of those foundational ideas that sounds almost too simple to matter, right up until you realize most of modern computing is an extravagant set of accessories wrapped around it.

## The processor's job

At a high level, a processor has two problems to solve over and over:

- figure out which instruction comes next
- carry out the operation that instruction describes

An **instruction** is a byte pattern that the CPU interprets as an operation. Depending on the architecture, one instruction might mean "add these two values," "load a value from memory," "store a value back," or "jump to a different address."

This is the first major place where context becomes law. The byte `0x41` could be the ASCII letter `A` in one situation, plain data in another, or part of a machine instruction somewhere else. Bytes are not born with meaning attached. Meaning comes from how the system chooses to interpret them.

That is a useful security instinct, by the way. If you can keep asking "who is interpreting these bytes, and under what rules?" you will understand a lot of bugs before they understand you.

## Registers: the CPU's scratch space

Before we walk the cycle, we need one more component: **registers**.

Registers are tiny storage locations inside the processor itself. They hold values the CPU is actively working with. If main memory is a warehouse, registers are the tools on the workbench: smaller, closer, and meant for immediate use.

Processors use registers because constantly going out to main memory for every tiny step would be slow and awkward. So instead, values that matter *right now* are copied into registers, worked on there, and written back out when needed.

There are many kinds of registers, but a beginner-safe mental model only needs a few:

- an **instruction pointer** that holds the address of the next instruction
- some **general-purpose registers** that hold working data
- a **flags** or **status** register that records results such as zero, carry, or negative

Do not get attached to the exact names yet. Architectures disagree about naming with the determination of standards committees and older siblings. The important part is the role each register plays.

## A tiny imagined machine

Real instruction sets are messy, historical, and occasionally shaped like an argument nobody won. So let us use a tiny pretend CPU with four instructions:

- `LOAD R1, [0x1000]` meaning "read the value at memory address `0x1000` into register `R1`"
- `LOAD R2, [0x1001]`
- `ADD R1, R2` meaning "add `R2` to `R1`, store the result in `R1`"
- `STORE R1, [0x1002]` meaning "write the value in `R1` to memory address `0x1002`"

Suppose memory begins like this:

```text
Data memory
0x1000  0x05
0x1001  0x07
0x1002  0x00
```

And suppose the program stored elsewhere in memory is conceptually:

```text
Instruction memory
0x2000  LOAD R1, [0x1000]
0x2001  LOAD R2, [0x1001]
0x2002  ADD R1, R2
0x2003  STORE R1, [0x1002]
```

That program adds `5` and `7`, then writes the result to `0x1002`.

Nothing about this is magical. The CPU is just following instructions one by one with the obsessive consistency of a parser that has never once felt joy.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["Instruction pointer = 0x2000"] --> B["Fetch instruction from memory"]
    B --> C["Decode operation and operands"]
    C --> D["Execute using registers and memory"]
    D --> E["Update instruction pointer"]
    E --> A
  </div>
  <figcaption>The processor lives in a loop: fetch, decode, execute, repeat.</figcaption>
</figure>

## Step through the cycle

Let us watch the machine do the work.

At the start:

- instruction pointer = `0x2000`
- `R1` = unknown
- `R2` = unknown
- memory at `0x1000` = `5`
- memory at `0x1001` = `7`

### 1. Fetch

The CPU looks at the instruction pointer, sees `0x2000`, and fetches the bytes stored there. Those bytes represent the instruction `LOAD R1, [0x1000]`.

Fetch is not "understanding." It is just retrieving the next instruction's bytes from memory. The processor has the raw material, not yet the action.

### 2. Decode

Now the CPU interprets those bytes according to its instruction set. It determines:

- the operation is `LOAD`
- the destination is register `R1`
- the source is memory address `0x1000`

This is decode: turning a byte pattern into an internal understanding of what operation is being requested.

### 3. Execute

The CPU reads memory at `0x1000`, gets the value `5`, and places it into `R1`.

Now the state is:

- `R1` = `5`
- instruction pointer moves to `0x2001`

Then the cycle repeats.

At `0x2001`, the CPU fetches `LOAD R2, [0x1001]`, decodes it, executes it, and ends up with:

- `R1` = `5`
- `R2` = `7`

At `0x2002`, it fetches `ADD R1, R2`, decodes the add operation, and executes:

`R1 = R1 + R2 = 5 + 7 = 12`

Now:

- `R1` = `12`
- `R2` = `7`

At `0x2003`, it executes `STORE R1, [0x1002]`, writing `12` back into memory.

Final memory:

```text
0x1000  0x05
0x1001  0x07
0x1002  0x0C
```

The machine has completed a tiny program.

No line of source code was required for the processor to understand this. What it actually consumed were encoded instruction bytes laid out in memory, one after another, then interpreted according to the CPU's rules.

That is the bridge between "memory contains bytes" and "the system performs computation."

## Why the instruction pointer matters so much

The instruction pointer deserves extra suspicion because it decides where execution continues.

If execution normally advances from one instruction to the next, then a **jump** or **branch** instruction changes that path by loading a new address into the instruction pointer. That is how loops, conditionals, function calls, and returns become possible.

Imagine:

```text
0x3000  CMP R1, R2
0x3001  JZ 0x3005
0x3002  LOAD R3, [0x4000]
0x3003  ADD R3, R1
0x3004  STORE R3, [0x4001]
0x3005  HALT
```

If `CMP` determines that `R1` and `R2` are equal, it sets a status flag. Then `JZ` means "jump if zero." If that flag is set, execution skips ahead to `0x3005`.

This is how control flow works at the machine level. High-level ideas like `if`, `while`, and `for` eventually collapse into tests, flags, and changes to the instruction pointer. The source language is the polite front desk. Underneath, the CPU is still redirecting execution by changing which address gets fetched next.

And yes, this is why control-flow bugs are such an enduring security problem. If an attacker can corrupt the data that influences instruction selection or redirect the instruction pointer outright, the machine will very obediently execute bytes it was never meant to trust. The processor is not morally opposed to malicious input. It is opposed to ambiguity.

## Code and data are both bytes

This point matters enough to say plainly: both instructions and ordinary data are stored as bytes.

The difference is not in the atoms. The difference is in interpretation.

If the CPU fetches bytes from an address intended to hold code, it decodes them as instructions. If a program reads bytes from an address intended to hold text or numbers, it interprets them as data. In some systems those regions are kept separate and protected. In others, they are more loosely managed. But the underlying storage substrate is still just bytes at addresses.

That is why memory corruption bugs can become code execution bugs. If boundaries fail, data can start influencing control flow, and the processor will not pause to ask whether this was spiritually the developer's intention.

This also helps explain why disassemblers exist. A disassembler looks at bytes and tries to interpret them as processor instructions so a human can inspect the program's low-level behavior. It is doing, in a readable form, the same sort of interpretive step the CPU does during decode.

## One machine, many abstractions

At this point, the narrative thread of the whole track should feel tighter.

Bits gave us distinguishable state.

Bytes gave us standard-sized storage.

Addresses gave us placement.

Endianness gave us rules for larger values across multiple bytes.

Instructions give some byte patterns operational meaning.

Registers give the processor a small working set.

And the fetch-decode-execute cycle gives the machine a way to keep turning stored patterns into behavior.

This is the first place where a computer starts to look less like a static container and more like a system in motion. Not because magic has arrived, but because interpretation plus repetition is enough to create the illusion of intelligence. Most abstractions are built by repeating a few simple rules until the human watching starts attributing personality to the result.

That is flattering to the machine and usually unhelpful to the analyst.

## What comes next

Now that the processor has instructions, registers, and a control-flow loop, the next lesson is how functions actually get organized during execution: the stack, call frames, and why returning to the wrong address is rarely considered a minor clerical issue.
