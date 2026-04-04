---
title: "Structs are how programs give related bytes a shape"
date: 2026-04-03 09:30:00 -0400
categories: [skills]
tags: [structs, memory-layout, offsets, pointers, c, fundamentals, teaching-track]
summary: "A struct is a layout rule for related data in memory, letting programs treat one region of bytes as named fields at known offsets instead of as a sad, unlabeled pile."
---

Last time, we got to pointers: values that store memory addresses, which is how a program remembers where some other data lives. That was a major step because pointers let software connect memory to meaning. They also let software drive straight into disaster with the confidence of a rental car.

But pointers alone still leave us with an awkward question.

If a pointer leads to some useful object in memory, what exactly is at that address?

Sometimes the answer is simple. It might point to a single integer. It might point to the first element of an array. But real programs rarely survive on lone integers and vibes. They need to keep related facts together: a user's ID, a flag saying whether the user is an admin, a pointer to a username buffer, a timestamp, a length, a checksum, a socket state, a packet header. If those facts all matter together, the program needs a disciplined way to say, "these bytes belong to one thing, and these parts inside it mean different things."

That discipline is the `struct`.

A **struct** is a rule for laying out related fields in memory. It does not create magical object essence. It does not make bytes more noble. It says: this region of memory should be interpreted as several named pieces, each at a known offset from the beginning.

That is the whole game.

## Start with raw memory

Imagine a program stores this in memory:

```text
Address   Value
0x3000    2A
0x3001    00
0x3002    00
0x3003    00
0x3004    01
0x3005    00
0x3006    00
0x3007    00
```

Those are just bytes. The machine does not volunteer commentary.

A program could interpret the first four bytes as the integer `42` and the next four bytes as the integer `1`, assuming a little-endian system. If it does, then this block might represent a tiny record like:

- `id = 42`
- `is_admin = 1`

Without a layout rule, though, that interpretation lives only in human hope and scattered code comments, which is how bugs get promoted into architecture.

A struct gives the layout a name.

```c
struct User {
    int id;
    int is_admin;
};
```

Now the program has a shared rule: if some bytes are treated as `struct User`, then the first field is `id` and the next field is `is_admin`.

Same bytes. Better discipline.

## A struct is a memory map with field names

Here is the key mental model:

- a struct begins at some starting address
- each field lives at a fixed offset from that start
- code accesses a field by adding the right offset and interpreting the bytes using the field's type

If a `struct User` starts at `0x3000`, then conceptually it might look like this:

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["Base address: 0x3000"] --> B["offset +0: id (4 bytes)"]
    A --> C["offset +4: is_admin (4 bytes)"]
  </div>
  <figcaption>A struct turns one starting address into a small map of named fields at fixed offsets.</figcaption>
</figure>

That means:

- bytes at `0x3000` through `0x3003` are `id`
- bytes at `0x3004` through `0x3007` are `is_admin`

Notice what happened there. We did not escape from memory. We got more precise about how memory is organized.

This is why structs matter so much. They are one of the main ways software climbs from "here are some bytes" to "here is a meaningful record" without losing sight of the machine underneath.

## A concrete C example

Consider this:

```c
struct User {
    int id;
    int is_admin;
};

int main() {
    struct User u;
    u.id = 42;
    u.is_admin = 1;
}
```

When `u` exists in memory, it occupies one contiguous region large enough to hold both fields. If `u` begins at address `0x5000`, one plausible layout is:

```text
0x5000  2A 00 00 00   // id = 42
0x5004  01 00 00 00   // is_admin = 1
```

The syntax `u.id` does not summon the `id` from a mystical property dimension. It means: start at the address of `u`, move to the offset for the `id` field, and read or write the bytes there as an `int`.

Likewise, `u.is_admin` means: start at the address of `u`, move to that field's offset, and operate there.

The compiler handles the arithmetic for you. That convenience is useful. It is also how entire generations of programmers forgot that field access is still pointer arithmetic wearing a suit.

## Pointers to structs

Structs become especially useful once pointers enter the scene, which is good because pointers enter every scene whether invited or not.

```c
struct User *p = &u;
```

Now `p` contains the address of the struct. If `u` lives at `0x5000`, then `p` contains `0x5000`.

To access fields through the pointer, C lets you write:

```c
(*p).id = 42;
```

That means:

1. dereference `p` to reach the struct in memory
2. access the `id` field within that struct

Because programmers eventually demanded a notation that did not look like punctuation fighting for custody, C also provides:

```c
p->id = 42;
```

The arrow operator means "follow this pointer to a struct, then access a field inside it."

That operator is just shorthand. The underlying machine story is the same:

- `p` stores the base address of the struct
- the field name implies an offset
- the program reads or writes bytes at base-plus-offset

## Why structs are more than convenience

At first glance, a struct can look like a mere nicety for source code organization. It is much more than that.

A struct creates a consistent contract about memory layout.

That contract matters when:

- one function fills in a record and another function reads it later
- a network parser interprets incoming bytes as a header
- a file format is described as a sequence of fields
- an operating system kernel defines a process descriptor
- a security boundary depends on the size and order of fields being exactly what the code expects

Once multiple parts of a program agree on a struct layout, a single base address becomes enough to recover all the pieces.

This is also why mistakes in struct handling can become real vulnerabilities. If code assumes the wrong field size, the wrong offset, or the wrong total struct size, it may read garbage, leak adjacent data, or overwrite memory it never owned. The machine does not pause to ask whether the schema migration was emotionally difficult.

## Structs can contain pointers too

Now the idea gets stronger.

A struct field does not need to be raw data like an integer. It can itself be a pointer.

```c
struct User {
    int id;
    char *name;
};
```

This does not mean the struct contains the whole string inline. It means the struct contains:

- an `id`
- a pointer to where the string lives

If `id` is stored directly in the struct and `name` points to heap memory elsewhere, then the struct becomes a little coordination center:

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["struct User at 0x6000"] --> B["id field"]
    A --> C["name field: pointer"]
    C --> D["heap bytes: 'gagan\\0'"]
  </div>
  <figcaption>A struct can mix inline fields with pointers to data stored elsewhere.</figcaption>
</figure>

This pattern is everywhere. Real software constantly uses structs to combine:

- values stored directly inside the record
- pointers to other memory regions
- flags and lengths that explain how to interpret those regions

That is how programs build richer data models while still remaining, at bottom, a set of bytes and addresses.

## A packet header is a struct-shaped problem

Suppose a program receives a network message whose first few bytes mean:

- 1 byte: version
- 1 byte: message type
- 2 bytes: payload length

Those four bytes can be described structurally:

```c
struct Header {
    unsigned char version;
    unsigned char type;
    unsigned short length;
};
```

Now a block of memory can be interpreted as a header with named fields instead of as four bytes that future-you has to decode while muttering at past-you.

Conceptually:

```text
Address   Meaning
0x7000    version
0x7001    type
0x7002    length low/high bytes
0x7003    length low/high bytes
```

This is useful, but it is also where careful engineers start squinting. Why? Because once binary formats matter, details like endianness, field width, and padding become non-negotiable. If the sender and receiver disagree about layout, they are not "sort of interoperable." They are just wrong in two different places.

That is why low-level systems, compilers, kernel code, exploit development, reverse engineering, and protocol design all care so deeply about structure layout. A struct is not just a coding style preference. It is part of the machine contract.

## The offset idea is what really matters

If you remember one thing from this lesson, remember this:

**A struct turns one address into several predictable offsets.**

That sentence explains field access, record parsing, object layout, and a large amount of systems programming.

If `base` is the starting address of a struct, then every field access is effectively:

```text
field address = base address + field offset
```

The compiler usually hides this arithmetic because humans have other things to do. But the arithmetic is still the truth underneath.

This is also why tools like debuggers, disassemblers, and memory forensics utilities can reconstruct meaning from raw memory. Once they know the layout rule, they can label offsets and decode fields from a base address. That is the same trick your compiler uses, just with fewer illusions and often more caffeine.

## Where the clean story gets messier

So far, I have described structs as if fields march through memory one after another with military precision. Sometimes they do. Sometimes the compiler inserts extra space between fields or after the last field. That is called **padding**, and it exists because hardware often prefers values to be aligned on certain byte boundaries.

In other words, the conceptual layout:

```text
field A
field B
field C
```

may become the real machine layout:

```text
field A
padding
field B
field C
padding
```

That extra space surprises beginners, breaks naive binary parsing, and becomes very relevant in security work when uninitialized padding leaks stale memory contents. The machine loves consistency. The machine is less invested in your intuition.

We are not going deep on alignment today, because today is about the core struct idea: named fields at defined offsets inside one contiguous object.

## The practical mental model

Use this model:

A struct is a layout recipe that tells the program how to interpret one contiguous region of memory as a collection of related fields.

That explains why structs are foundational.

They let a pointer refer not just to "some bytes," but to "a record with parts." They let source code name those parts. They let binary formats be described. They let programs pass richer state around without pretending memory stopped existing.

And they remind us, again, that higher-level clarity is not built by escaping the machine. It is built by giving the machine better rules.

Next time, we will look at why those fields do not always sit back-to-back in memory and how **alignment and padding** quietly shape performance, interoperability, and a surprising number of bugs.
