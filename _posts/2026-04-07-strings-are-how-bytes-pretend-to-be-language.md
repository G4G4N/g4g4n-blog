---
title: "Strings are how bytes pretend to be language"
date: 2026-04-07 08:22:42 -0400
categories: [skills]
tags: [strings, character-buffers, null-termination, arrays, ascii, memory-layout, fundamentals, teaching-track]
summary: "A string is not mystical text but a character buffer plus a rule for where it ends, which is why human-readable data lives on the same memory terms as everything else."
---

Last time, we looked at arrays: one layout repeated many times, back-to-back, so the machine can find element `n` by arithmetic instead of by optimism. That gave us a clean memory model for repeated values.

Now we can do something slightly more familiar and slightly more dangerous.

What if the repeated values are characters?

That is where strings enter the story.

A **string** is one of the most common abstractions in computing, which is unfortunate because people talk about it as if text somehow floats above the machine on a small cloud of meaning. It does not. A string is still bytes in memory. The only difference is that we agree to interpret those bytes as characters, and we need some rule to know where the sequence ends.

That is the whole lesson in one sentence:

**A string is a character buffer plus an ending rule.**

Everything else is implementation detail, syntax, or an incident report.

## Start with the memory, not the word

Suppose memory contains these bytes:

```text
Address   Byte   ASCII
0x1000    0x48   H
0x1001    0x69   i
0x1002    0x21   !
0x1003    0x00   NUL
```

If we interpret the first three bytes as ASCII characters, they spell `Hi!`

The byte `0x00` at the end is not punctuation. It is a control value called the **null byte**. In C-style strings, that null byte marks the end of the string.

So this memory region represents the string `"Hi!"` not because the machine senses human enthusiasm, but because code follows a convention:

- read bytes as characters
- keep going until you hit `0x00`

That convention is called **null termination**.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["0x1000: H"] --> B["0x1001: i"] --> C["0x1002: !"] --> D["0x1003: 0x00"]
    D --> E["Stop reading here"]
  </div>
  <figcaption>A C-style string is a run of character bytes followed by a null terminator that marks the boundary.</figcaption>
</figure>

Notice what happened. The bytes themselves did not change. We changed the rule for interpreting them. This should sound familiar by now because it is the recurring theme of the entire track: bytes become useful only when a system applies disciplined meaning to them.

## Strings are arrays with a social contract

In C, a string like this:

```c
char msg[] = "Hi!";
```

is really an array of characters in memory:

```text
msg[0] = 'H'
msg[1] = 'i'
msg[2] = '!'
msg[3] = '\0'
```

That last element matters. The visible text has length 3, but the array needs 4 bytes because the terminator must fit too.

This is one of the first places beginners get ambushed. They count the letters, allocate that many bytes, and forget the null terminator. The machine then keeps reading beyond the intended buffer until it eventually finds a `0x00` somewhere else, which is a spectacularly bad way to discover adjacent memory.

So when you hear "string," keep a more disciplined definition in your head:

- the payload is a sequence of character bytes
- the implementation still depends on layout
- the boundary is not implied by vibes

The string works only because the program knows how to find the end.

## The terminator is not metadata somewhere else

This detail matters. In null-terminated strings, the end marker is stored **inside the same memory region** as the character bytes.

That means functions such as `strlen()` do not magically know the string's length. They start at the beginning and scan byte by byte until they hit `0x00`.

For `"cat"` in memory:

```text
0x2000  0x63   c
0x2001  0x61   a
0x2002  0x74   t
0x2003  0x00   NUL
```

`strlen()` conceptually does this:

1. read `0x63`, not zero, continue
2. read `0x61`, not zero, continue
3. read `0x74`, not zero, continue
4. read `0x00`, stop
5. report length `3`

That is elegant in one sense because the string carries its own stop marker. It is awkward in another sense because length is not instantly available. To know how long the string is, the program must walk it.

This is a classic systems tradeoff: save one kind of bookkeeping, pay with scanning later.

## Character encoding is the quiet rulebook underneath

At this point, it is worth being careful with the word "character." A string is not a sequence of abstract letters descending from the heavens of language. It is a sequence of bytes interpreted under some **character encoding**.

In early examples, we often use ASCII because it keeps the explanation honest:

- `0x41` means `A`
- `0x61` means `a`
- `0x30` means `0`

So the string `"BAD"` might be:

```text
0x42 0x41 0x44 0x00
```

But the deeper point is not "memorize ASCII tables." The deeper point is that text is still encoded data. The bytes are not language by themselves. They become language when software applies an encoding rule and a boundary rule at the same time.

That matters because not all text fits neatly into one byte per character. UTF-8, for example, uses one to four bytes per code point. That means "string length" can mean different things depending on whether you are counting bytes, code points, or visible characters. Human language is more complicated than the machine would prefer, which is why software engineers eventually end up learning humility one encoding bug at a time.

For this lesson, though, the stable first-principles model is enough:

- strings live in memory as bytes
- those bytes are interpreted through an encoding
- some convention defines where the string ends

## Buffers and strings are related, not identical

This distinction is important enough to defend with a chair.

A **buffer** is just a region of memory reserved to hold data.

A **string** is data in a buffer that is being interpreted as text under some encoding and boundary rule.

So every string needs storage, but not every buffer contains a valid string.

Consider:

```c
char buf[8];
```

That allocates eight bytes. It does **not** automatically create a meaningful string. Until code puts character data there and ensures a terminator appears somewhere valid, `buf` is just an 8-byte region. If you treat it as a string before initializing it properly, the program may scan random leftover bytes looking for a null terminator. That is how "just printing a string" turns into memory disclosure with surprisingly crisp output.

## A concrete overflow example

Suppose you do this:

```c
char name[8];
strcpy(name, "security");
```

The visible word `"security"` has 8 letters:

- `s`
- `e`
- `c`
- `u`
- `r`
- `i`
- `t`
- `y`

But a null-terminated C string needs one more byte for `'\0'`.

So the copy attempts to write 9 bytes into an 8-byte array.

Conceptually:

```text
Target buffer (8 bytes)
+---+---+---+---+---+---+---+---+
| s | e | c | u | r | i | t | y |
+---+---+---+---+---+---+---+---+

Required extra byte
+---+
| 00|
+---+
```

That extra byte has to go somewhere. If the destination buffer is on the stack, it may overwrite adjacent stack data. If it is on the heap, it may corrupt nearby heap state. Same old story, new costume: the program lied about the boundary, and memory noticed.

This is why string handling has such a long and undignified security history. The abstraction feels friendly because it represents human text, but the underlying mechanics are still:

- byte counts
- buffer sizes
- stop markers
- trust boundaries

Attackers love any place where developers think "text" means "safe."

## Strings do not remember capacity either

Arrays already taught us that raw memory layouts are not self-aware. Strings in low-level languages inherit the same problem.

If a function receives a `char *`, that pointer may identify the start of a string, but by itself it does not tell you:

- how large the backing buffer is
- whether the bytes are initialized
- whether a null terminator exists within the valid region
- whether the encoding is what you think it is

That missing context is the source of endless bugs.

For example:

```c
void greet(char *name) {
    printf("Hello, %s\n", name);
}
```

This looks harmless. But `%s` tells `printf` to keep reading bytes until it finds a null terminator. If `name` points to a buffer that is not properly terminated, `printf` will read past the intended boundary into whatever comes next in memory. The formatting library is not malicious. It is merely loyal to the string convention.

In security work, this is a recurring theme: perfectly normal library behavior becomes dangerous when the input fails to obey the hidden contract.

## Length-prefixed strings solve one problem and create another

Null termination is not the only ending rule.

Some systems store strings with an explicit length field, conceptually like:

```text
Length: 3
Bytes:  63 61 74
```

Now the program does not need to scan for a terminator. It already knows the payload length is 3.

That changes the tradeoff:

- null-terminated strings make finding the end a scanning problem
- length-prefixed strings make finding the end a metadata-trust problem

If the stored length is wrong, corrupted, or attacker-controlled, the parser may still read too much or too little. There is no free lunch in systems design, only different forms of paperwork.

Still, comparing the two models helps clarify the core lesson:

text storage is never "just text." It is always text plus some rule about boundaries.

## Why strings matter far beyond user interfaces

It is easy to think of strings as UI material. Names, messages, logs, prompts. But systems use string-like data everywhere:

- file paths
- environment variables
- HTTP headers
- DNS names
- command-line arguments
- usernames
- SQL queries
- JSON fields
- protocol tokens

All of these end up as bytes in memory, and all of them rely on some combination of encoding and boundary rules. The higher-level label changes. The machine story does not.

That is why string bugs are rarely just cosmetic. A malformed path can break filesystem access. A bad header can desynchronize a parser. A missing terminator can leak memory. An unexpected embedded null byte can confuse validation logic. A mismatched encoding can produce bypasses where two components think they agreed on text but actually agreed on different byte sequences with matching optimism.

Strings are where human meaning and machine representation collide daily. It is one of the busiest borders in the whole stack.

## The practical mental model

If you want the durable version of the lesson, keep this one:

A string is a character buffer interpreted under an encoding, plus a convention for where the sequence ends.

That model explains:

- why strings are built on arrays
- why the null terminator exists
- why `strlen()` scans
- why buffer sizing errors are so common
- why untrusted text can still become a memory bug
- why "text handling" and "binary handling" are not opposites so much as neighboring offices with a shared disaster staircase

Once you see strings this way, they stop feeling magical. They become ordinary machine objects with a very popular abstraction layered on top. That is progress. Also, it makes debugging less theological.

## What comes next

So far, repeated data has mostly lived contiguously: arrays, strings, buffers, structs repeated in order. Next time, we will break that assumption on purpose and look at **linked lists**, where sequence is no longer "next bytes in memory" but "follow the next pointer and hope the bookkeeping is honest."
