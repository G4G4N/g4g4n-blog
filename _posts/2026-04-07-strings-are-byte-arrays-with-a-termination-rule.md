---
title: "Strings are byte arrays with a termination rule"
date: 2026-04-07 20:51:00 -0400
categories: [skills]
tags: [strings, char-buffers, null-termination, arrays, pointers, memory-layout, fundamentals, teaching-track]
summary: "A string in low-level memory is not mystical text but a sequence of bytes interpreted as characters, usually ending with a zero byte so code knows where the readable part stops."
---

Last time, we looked at arrays: one base address, one element layout, one repeated stride, and indexing as arithmetic rather than ceremony. That gives us the right launch point for something that feels much friendlier on the surface and is absolutely not friendlier underneath.

Text.

Humans see text and think in words, sentences, names, logs, commands, and messages. The machine sees bytes. It always sees bytes. A "string" is what happens when software agrees to interpret some of those bytes as characters and then adopts a rule for knowing where the meaningful sequence ends.

That last part matters more than people expect.

At a low level, a string is usually just a **character buffer**: a region of memory containing one byte per character, plus some convention that tells code where the text stops. In classic C-style strings, that convention is a special byte with value `0x00`, often written as `'\0'` and called the **null terminator**.

So a string is not "text" in the spiritual sense. It is an array of bytes with a boundary rule. Computers love boundary rules. Security failures often begin when humans get casual about them.

## Start with the raw bytes

Suppose we write this in C:

```c
char word[] = "cat";
```

Many beginners imagine three bytes because the word has three letters. The actual layout is usually four bytes:

- `'c'` -> `0x63`
- `'a'` -> `0x61`
- `'t'` -> `0x74`
- `'\0'` -> `0x00`

If `word` begins at address `0x1000`, memory might look like this:

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["0x1000: 'c' (0x63)"] --> B["0x1001: 'a' (0x61)"] --> C["0x1002: 't' (0x74)"] --> D["0x1003: '\\0' (0x00)"]
  </div>
  <figcaption>A C-style string stores the visible characters and then one extra zero byte that marks the end.</figcaption>
</figure>

That zero byte is not decoration. It is the stop sign.

Functions that operate on C strings often start at the first byte and keep reading forward until they encounter `0x00`. That is how `strlen`, `printf("%s", ...)`, and many parsing routines decide where the string ends. There is no separate little field nearby saying "length: 3" unless some other code explicitly stores one. The terminator is the contract.

## The machine does not know what text is

This is a good place to keep your mental model honest.

The byte `0x63` is not intrinsically the letter `c`. It becomes `c` because some character encoding says so. In plain ASCII, `0x41` means `A`, `0x61` means `a`, and `0x30` means `0`. That mapping is a convention software agrees to use.

So when you look at a string buffer, two things are happening at once:

- the bytes occupy memory exactly like any other array
- software interprets those bytes through a character encoding

That means text is not separate from raw memory. Text is raw memory with an interpretation layer. Once you accept that, a lot of later systems behavior becomes less magical and more prosecutable.

## Null termination is simple and powerful

Why use a terminating zero byte at all?

Because it lets code work with strings of varying length without storing a separate length next to every buffer. If a function receives a pointer to the first character, it can scan until it sees the terminator.

Conceptually:

```c
size_t my_strlen(const char *s) {
    size_t n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}
```

This is beautifully simple and slightly dangerous, which is a recurring theme in C.

The function does not know how much memory was allocated for `s`. It trusts that somewhere ahead, a null byte exists before the program wanders into memory it should not read. If that trust is misplaced, the code may keep scanning into unrelated data. In less diplomatic terms, the function starts walking the neighborhood until it finds a zero and hopes no one notices.

## A buffer is not the same as the string inside it

This distinction causes endless confusion, so it is worth being blunt.

Consider:

```c
char name[16] = "gagan";
```

The **buffer** is 16 bytes long.
The **string currently stored inside it** is 5 visible characters plus the null terminator, so 6 bytes are in active use.

Memory might look like this:

```text
offset 0:  'g'
offset 1:  'a'
offset 2:  'g'
offset 3:  'a'
offset 4:  'n'
offset 5:  '\0'
offset 6:  unused
...
offset 15: unused
```

That means "buffer size" and "string length" are different quantities:

- buffer size = total storage available
- string length = number of characters before the null terminator

People mix these up constantly. Attackers appreciate the effort.

## Copying text is copying bytes plus a boundary

Suppose you want to copy `"admin"` into an 8-byte buffer. That is fine:

```c
char role[8];
```

To store `"admin"` safely, you need these bytes:

- `a`
- `d`
- `m`
- `i`
- `n`
- `\0`

That takes 6 bytes total. Still fine.

But if you try to store `"administrator"` in that same buffer, you have a problem. The visible word is 13 bytes in ASCII, and you still need one more byte for the terminator. Fourteen bytes do not fit in eight bytes no matter how sincerely the developer believes in positive outcomes.

This is one of the roots of classic buffer overflows. Code treats the destination as "a place for text" instead of as "a finite byte region with strict boundaries." Once the string is bigger than the buffer, adjacent memory becomes collateral damage.

## Missing terminators create strange and dangerous behavior

Now consider a subtler failure.

```c
char code[4] = {'P', 'I', 'N', 'G'};
```

Is that a valid C string?

No.

It is an array of four characters, but there is no terminating zero byte. If some function later treats `code` as a C string, it may keep reading past those four bytes until it eventually finds a `0x00` somewhere in later memory.

That can produce:

- accidental disclosure of adjacent data
- crashes from invalid reads
- nonsense output that looks "mostly right" and wastes hours

Here is the important distinction:

- an array of characters is just a byte array
- a C string is a character array that obeys the null-termination rule

Same material, different contract.

## Why strings are such a common bug source

Strings sit at the collision point between human meaning and machine layout.

Humans think:

- usernames
- file paths
- HTTP headers
- chat messages
- shell commands

The machine sees:

- bytes
- lengths or terminators
- encodings
- buffer capacities
- copy operations

Whenever software forgets one of those machine details, trouble arrives in a familiar set of costumes:

- reading past the end because no terminator was present
- writing past the end because the destination buffer was too small
- truncating data and accidentally changing meaning
- confusing byte count with character count
- treating untrusted bytes as harmless text

That is why so many historical vulnerabilities involve string handling. Text feels high-level to humans, but its implementation is aggressively low-level. The abstraction smiles while the memory model sharpens a knife behind its back.

## Strings and pointers fit together naturally

Because a string is usually stored as consecutive bytes in memory, a pointer to a string is typically just a pointer to its first character.

If:

```c
char word[] = "cat";
char *p = word;
```

then `p` holds the address of the first byte, the `c`. Code can read successive characters by advancing the pointer one byte at a time:

- `p + 0` -> `'c'`
- `p + 1` -> `'a'`
- `p + 2` -> `'t'`
- `p + 3` -> `'\0'`

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["p -> first character"] --> B["'c'"] --> C["'a'"] --> D["'t'"] --> E["'\\0'"]
  </div>
  <figcaption>A string pointer usually marks the first byte, and code walks forward until it reaches the terminating zero.</figcaption>
</figure>

This is why pointer mistakes and string bugs are close relatives. String handling often is pointer arithmetic plus a stopping condition. If the stopping condition is wrong or missing, pointer movement becomes a guided tour of memory you did not mean to expose.

## The durable mental model

If you want one compact model to keep:

A low-level string is not a special text object. It is a byte array interpreted as characters, plus a rule that marks where the meaningful sequence ends.

For classic C strings, that rule is null termination.

That means every string question eventually reduces to a few machine questions:

- where does the buffer start?
- how many bytes fit?
- where is the terminator?
- what encoding maps bytes to characters?
- what happens if any of those assumptions are wrong?

Once you think that way, strings stop being fluffy application data and return to what they always were: memory with attitude.

Next time, we will make the boundary problem even more explicit by looking at **length-prefixed data and why some systems store size up front instead of trusting a terminator to appear before disaster does**.
