---
title: "Bits are the first promise a computer makes"
date: 2026-03-21 19:00:00 -0400
categories: [skills]
tags: [bits, fundamentals, computing, teaching-track]
summary: "The teaching track starts at the bottom: a bit is not just a 0 or 1, it is the smallest reliable agreement a machine can make about a state."
---

If you want to understand computers from the ground up, you have to start smaller than files, smaller than apps, and smaller than code.

You start with a bit.

People often hear “a bit is a 0 or 1” and stop there, which is fine if your goal is to survive a quiz and immediately forget everything afterward. But if you actually want to understand what a computer is doing, that definition is too thin. A bit is better understood as a tiny promise about state. At a given moment, the machine can reliably distinguish one condition from another: on or off, high voltage or low voltage, yes or no, true or false. The exact implementation changes. The pattern does not.

That detail sounds almost insultingly simple until you realize the entire stack sits on top of it. Browsers, images, malware, cloud platforms, operating systems, and the extremely confident person explaining crypto on LinkedIn all eventually bottom out in a machine preserving and interpreting state differences with unreasonable discipline.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["Physical state"] --> B["Bit"]
    B --> C["Byte"]
    C --> D["Encoded value"]
    D --> E["Instruction or data"]
    E --> F["Program"]
    F --> G["System"]
  </div>
  <figcaption>The stack gets complicated later, but it starts with a machine reliably preserving state.</figcaption>
</figure>

The reason two states matter is not because binary is mathematically fashionable. It matters because physical systems are noisy, messy, and deeply uninterested in your desire for perfect precision. If you try to build a machine around too many subtly different states, the world will mock you with heat, interference, wear, and ambiguity. Two states are easier to separate reliably. That reliability is the whole game. If a machine can repeatedly tell the difference between one state and another without getting confused, you can start composing those distinctions into larger structures. That is where computing begins to feel less like magic and more like engineering.

There is also a useful distinction here between physics and interpretation. When we write `0` and `1`, we are already one layer up the abstraction ladder. Somewhere below that, a transistor is allowing current or blocking it, a memory cell is charged or uncharged, or a voltage level is sitting above or below a threshold. The machine does not see numerals. It detects conditions. Humans then agree to interpret those conditions symbolically as bits. That is important, because it means digital logic is not a mysterious separate universe. It is a carefully managed translation layer on top of physical reality.

Once you have bits, meaning starts showing up only because we impose structure on top of them. A single bit can tell you something small but useful, like whether a flag is set or a condition is true. The real power arrives when bits are grouped. A handful of bits can represent a number. A larger group can represent a letter. More of them can represent an instruction, a pixel, a packet field, a timestamp, or a chunk of memory. The machine is still doing the same primitive thing underneath. We are just layering interpretation onto repeated state distinctions until the result becomes useful.

That is why it is misleading to say bits “naturally” mean numbers. They do not. They become numbers because we agree on an encoding. The same is true for text. The machine does not know what the letter `A` means in any poetic sense. It only knows that a particular bit pattern maps to a symbol because a standard says so. Files, messages, images, source code, and executables all work the same way: they are stored patterns plus a rulebook for interpretation. Once that clicks, computers stop feeling mystical and start feeling honest. Complicated, yes. Mystical, no.

Bits also matter because they show up everywhere in security work, even when people pretend they live entirely at the dashboard layer. Permissions are bitmasks. Packet headers are bit fields. Memory corruption happens at the byte and bit level. Cryptography manipulates structured binary data. File formats and protocols only behave if both sides agree on the exact representation of information. If you do not understand how systems represent state, security can turn into a strange ritual where you memorize tools but never really understand why they break.

The most useful mental model from this lesson is that computers do not begin with high-level meaning. They begin with stable distinctions. Those distinctions become bits. Bits become values. Values become instructions and data. Instructions and data become programs. Programs become systems. Systems become the glorious mess we all spend our lives defending, debugging, and occasionally cursing at in public. That progression is what makes the stack legible.

So if you want a clean way to think about this, remember that a bit is the first reliable agreement a machine can make about the world. It is tiny, boring, and absolutely foundational. Which is, frankly, a pretty good description of a lot of real security work too.

## What comes next

The next step after bits is bytes, and then how bytes become numbers, characters, and machine-readable structure. That is the point where the machine stops looking like an abstract box and starts looking like something you can actually reason about without incense.
