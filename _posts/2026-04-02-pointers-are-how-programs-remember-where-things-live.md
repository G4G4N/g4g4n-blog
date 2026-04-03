---
title: "Pointers are how programs remember where things live"
date: 2026-04-02 20:05:29 -0400
categories: [skills]
tags: [pointers, memory, addresses, heap, stack, fundamentals, teaching-track]
summary: "A pointer is a value that stores a memory address, which is how programs keep track of data, connect structures, and create entire categories of bugs when they trust the wrong location."
---

Last time, we looked at the heap: the part of memory a program uses when data needs to survive beyond the current function call. That gave us flexible lifetime, reusable storage, and a fresh collection of ways to wreck a perfectly good afternoon.

But the heap lesson leaves an obvious question hanging in the air.

If data lives somewhere else in memory, how does the program keep track of it?

The answer is the pointer.

A **pointer** is a value whose job is to store a memory address. Not the data itself. Not a mystical reference aura. Just an address: a location that says, in effect, "the thing you want is over there."

This is one of the most important ideas in computing because it explains how programs connect memory to meaning. A pointer lets code find a heap allocation, walk through an array, link one data structure to another, hand a buffer to a function, or remember where execution should continue later. It is also one of the most dangerous ideas in computing because a wrong address still looks like an address. The machine does not grade intent.

## Start with the plain version

Suppose memory contains this:

```text
Address   Value
0x1000    41
0x1001    42
0x1002    43
0x1003    44
```

Now suppose a variable named `p` contains the value `0x1000`.

That means `p` is pointing at the byte stored at address `0x1000`.

If the program treats `p` as a pointer to bytes, dereferencing `p` means "go to the address stored in `p` and read what is there." In this case, dereferencing `p` reads the byte `41`.

That is the whole mechanism:

- the pointer stores an address
- the address names a location in memory
- dereferencing follows the address to reach the data

Everything more elaborate is built on that.

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["Variable p"] --> B["Pointer value: 0x1000"]
    B --> C["Memory at 0x1000"]
    C --> D["41"]
    C --> E["42"]
    C --> F["43"]
    C --> G["44"]
  </div>
  <figcaption>A pointer stores a location. Dereferencing follows that location to actual data.</figcaption>
</figure>

## The pointer is a value too

This point matters because beginners often talk about pointers as if they are floating arrows drawn by a textbook illustrator. The arrow is helpful. The arrow is also a lie of omission.

A pointer is itself stored somewhere and represented as bytes like any other value.

If a system uses 64-bit addresses, then a pointer is often 8 bytes wide. Its contents might be something like `0x0000000000001000`. That number is not special because it is a pointer. It becomes a pointer because the program interprets it as an address.

That should sound familiar by now. Bytes are not born with meaning. Context assigns meaning. The same byte pattern can be:

- an integer
- part of a machine instruction
- a character encoding
- a memory address stored in a pointer

The machine keeps forcing us back to the same lesson because it is a reliable lesson: interpretation rules are where meaning lives.

## A concrete C example

Here is a small C program:

```c
int score = 99;
int *p = &score;
```

Read it carefully.

`score` is an integer variable holding the value `99`.

`&score` means "the address of `score`."

`p` is declared as `int *`, which means "pointer to int."

So after these two lines:

- `score` contains `99`
- `p` contains the address where `score` lives

If `score` happens to live at address `0x7ffee410`, then conceptually:

```text
score = 99
p     = 0x7ffee410
```

If you then write:

```c
printf("%d\n", *p);
```

the `*p` means "go to the address stored in `p` and read the integer there." The printed result is `99`.

That `*` operator in a declaration and the `*` operator in an expression are annoyingly related but not identical:

- in `int *p`, it means `p` is a pointer to an `int`
- in `*p`, it means dereference the pointer and access the pointed-to value

This is classic C behavior: one symbol, multiple jobs, a whole generation of programmers developing stronger opinions than hobbies.

## Why pointers matter so much

Without pointers, a program could still hold values. It would struggle to build relationships between values.

Pointers are what let software say:

- this buffer lives on the heap, here is where to find it
- this node in a linked list leads to the next node
- this function should modify the caller's variable, not a copy
- this string starts at this address and continues until a terminator
- this return address on the stack is where execution resumes

In other words, pointers are how programs build structure out of raw memory.

An array in memory is useful partly because a pointer can name its first element. A tree is possible because each node can point to child nodes. A heap allocation is usable because some pointer still remembers where the allocator handed it out. Even the stack machinery we discussed earlier depends on saved addresses and references to memory locations. Remove addresses from the story and most abstractions collapse into very expensive confusion.

## Pointers and arrays

Pointers become less abstract when you see them used with arrays.

```c
int nums[4] = {10, 20, 30, 40};
int *p = nums;
```

Here, `p` points to the first element of the array.

If `nums` begins at address `0x2000`, and each `int` is 4 bytes, the layout might look like this:

```text
0x2000  10
0x2004  20
0x2008  30
0x200C  40
```

Now:

- `p` contains `0x2000`
- `*p` reads `10`
- `*(p + 1)` reads `20`
- `*(p + 2)` reads `30`

This is **pointer arithmetic**.

And here is the subtle but important rule: adding `1` to an `int *` does not move one byte. It moves by the size of one `int`.

So if `p` is an `int *`, then:

- `p + 1` means `0x2004`
- `p + 2` means `0x2008`

The type tells the compiler how far to step.

That is efficient and useful. It is also why a wrong pointer type can quietly turn memory access into fiction with excellent syntax.

## Passing by address

Pointers also explain how functions can modify data outside their own local copy.

Consider:

```c
void bump(int *value) {
    *value = *value + 1;
}

int main() {
    int x = 7;
    bump(&x);
}
```

`bump` does not receive the integer `7` directly. It receives the address of `x`.

Inside `bump`, dereferencing `value` reaches the original variable in the caller. So when the function increments `*value`, it is changing `x` itself.

This matters because it shows the difference between:

- passing a copy of a value
- passing the address of the original value

Many high-level programming conveniences are built on top of this distinction, whether they expose pointers directly or disguise them behind references, objects, slices, descriptors, or runtime-managed handles.

## Pointers make dynamic memory usable

Now connect this back to the heap.

When code does this:

```c
char *name = malloc(16);
```

the allocator returns an address. That returned address is stored in `name`, which is a pointer. The pointer is how the program finds the allocated block later.

Without the pointer, the heap allocation would be like renting a storage unit, immediately forgetting the address, and then describing the problem as "a resource management challenge." It is a challenge, yes. Mostly because you created it.

This is why losing the last pointer to a heap block often means a leak. The memory may still exist, but the program no longer knows where it is. The bytes did not vanish. The path to them did.

## Null pointers and invalid pointers

Not every pointer is safe to dereference.

A **null pointer** is a special pointer value that means "points to no valid object." In C, that is typically written as `NULL`.

```c
int *p = NULL;
```

Dereferencing `p` here is invalid because there is no legitimate target. A null pointer is useful precisely because it gives the program a clear sentinel value for "nothing is here."

More dangerous are pointers that are non-null but still invalid.

For example:

```c
int *p;
*p = 5;
```

Here `p` is uninitialized. It contains whatever bits happened to be in that storage location. That random bit pattern may look like an address, but it is not an address the program is entitled to trust.

Or:

```c
int *p = malloc(sizeof(int));
free(p);
*p = 5;
```

This is a use-after-free. The pointer still contains an address, but the program no longer owns the storage there.

That is one of the most important practical lessons about pointers:

The danger is not only "no address." The danger is also "an address whose validity story has expired."

## Indirection is power

Why tolerate all this complexity at all?

Because indirection is powerful.

A pointer lets one part of memory refer to another part of memory without copying everything around. That makes dynamic structures practical, function interfaces efficient, and large systems composable. If every operation had to duplicate the full underlying data instead of passing addresses to it, computing would be slower, clumsier, and far more limited.

Indirection is what lets a linked list node point to the next node instead of containing the entire rest of the list. It is what lets a file descriptor table point toward kernel-managed objects. It is what lets jump tables redirect execution based on state. It is what lets a language runtime represent objects as references to managed storage.

Indirection is also what gives attackers leverage when memory safety fails. If control over an address means control over what data or code gets reached next, then corrupting pointers becomes a direct way to corrupt behavior. Many low-level security bugs are really pointer-trust failures wearing different hats.

## The practical mental model

Keep the model disciplined:

A pointer is a value that stores a memory address. It becomes useful when the program follows that address to reach some other data, and it becomes dangerous when the program trusts an address it should not.

That sentence covers a lot of ground.

It explains arrays and heap allocations.

It explains pass-by-address function calls.

It explains why null checks matter.

It explains why use-after-free and wild-pointer bugs are serious.

And it explains why so much of systems programming feels like custodial work for addresses. Because that is what it is.

At the machine level, pointers are not exotic. They are the honest consequence of having addressable memory and programs that need to relate one location to another. Once you understand that, a large part of computing stops feeling magical and starts feeling procedural in the best possible way.

The magic never left, of course. We just found the label on the trapdoor.

## What comes next

Now that pointers can connect one memory location to another, the next lesson is data structures: how arrays, linked lists, and trees use addresses and layout rules to organize information instead of just storing it.
