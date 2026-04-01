---
title: "The heap is how programs keep data around"
date: 2026-04-01 18:45:00 -0400
categories: [skills]
tags: [heap, memory, allocation, pointers, fundamentals, teaching-track]
summary: "The heap is the part of memory programs use when data must outlive one function call, which makes software more flexible and also much easier to break."
---

Last time, we looked at the stack: the disciplined memory structure that keeps function calls from forgetting who they are, where they came from, and where they need to return. The stack is tidy because its lifetime rules are tidy. A function starts, its frame appears. A function ends, its frame disappears. Neat. Predictable. Almost suspiciously well-behaved.

But real programs are rarely that polite.

Sometimes data needs to survive after the current function returns. Sometimes you do not know the required size up front. Sometimes one part of a program creates something and another part uses it much later. The stack is bad at that kind of problem, because the stack is built around call order, not long-term custody.

That is where the heap enters the story.

The heap is the region of memory a program uses for data whose lifetime is decided more dynamically. Instead of being tied to "this function call is active right now," heap memory is requested when needed and released when no longer needed. That flexibility is powerful. It is also how software acquires a new class of bookkeeping mistakes with the confidence of a person saying "I’ll definitely remember this later."

## Why the stack is not enough

Imagine a function that builds a username string and returns it:

```c
char *make_name() {
    char name[16] = "gagan";
    return name;
}
```

This is wrong, and not in the fun way.

The array `name` lives in the function's stack frame. The moment `make_name()` returns, that frame is gone. Returning a pointer to `name` means returning the address of storage that no longer belongs to a live call. The bytes may still physically sit there for a moment, but the ownership rule is over. Reading them later is like relying on a hotel keycard after checkout and acting surprised when the room no longer feels reserved.

If the data needs to outlive the function that created it, the program needs memory with a lifetime not bound to that one stack frame.

That memory is often the heap.

## Asking for memory at runtime

Heap memory is usually obtained through an allocator. In C, that often means `malloc()` or `calloc()`. In higher-level languages, the same idea still exists even if the runtime hides the details behind `new`, object construction, or automatic garbage collection.

A simple C example looks like this:

```c
char *make_name() {
    char *name = malloc(16);
    if (name == NULL) {
        return NULL;
    }

    strcpy(name, "gagan");
    return name;
}
```

Now the function returns a pointer to heap memory instead of stack memory. That storage remains valid after the function returns because it is not tied to the vanished stack frame. Some later code can use it, pass it around, resize it, or eventually free it.

That is the key distinction:

- stack memory usually follows call lifetime
- heap memory usually follows program-managed lifetime

The heap is how a program says, "I need storage, but I need it on my terms, not the call stack's terms."

## The pointer is not the data

This is the point where beginners often step into a conceptual pothole. If a program allocates heap memory, the variable it receives is usually a pointer. The pointer is an address. It is not the actual block of data itself.

Consider this:

```c
int *scores = malloc(4 * sizeof(int));
```

If this succeeds, `scores` might hold an address like `0x602000`. That address is the location of the allocated block. The integer values live at that location and the bytes after it, not inside the pointer variable itself.

You can picture it like this:

<figure class="diagram-block">
  <div class="mermaid">
flowchart LR
    A["Stack variable: scores"] --> B["Pointer value: 0x602000"]
    B --> C["Heap block"]
    C --> D["int[0]"]
    C --> E["int[1]"]
    C --> F["int[2]"]
    C --> G["int[3]"]
  </div>
  <figcaption>The pointer is a location handle. The actual allocated data lives in the heap block it points to.</figcaption>
</figure>

That picture matters because much of low-level programming is really about managing relationships between addresses, lifetimes, and the code still allowed to trust them.

## Heap allocation is managed reuse, not infinite empty space

It is tempting to imagine the heap as a magical reserve of fresh memory where every request gets a pristine new kingdom. The machine would like to inform you that budgets exist.

The heap is managed by an allocator. When the program asks for memory, the allocator finds a suitable chunk from available space. When memory is released, that chunk can often be reused later for another allocation. So heap memory is not just "persistent." It is reusable storage whose correctness depends on the program keeping its promises about ownership and lifetime.

A rough lifecycle looks like this:

1. request a block
2. receive an address to that block
3. use the block within its allocated size
4. release the block when done

In C, that usually means `malloc()` followed later by `free()`.

```c
char *name = malloc(16);
if (name == NULL) {
    return;
}

strcpy(name, "gagan");
printf("%s\n", name);
free(name);
```

That final `free(name);` is not decorative. It tells the allocator that the program is done with the block.

## What goes wrong on the heap

The heap is flexible because the program gets to decide lifetime. The heap is dangerous because the program gets to decide lifetime.

That tradeoff produces several classic bug classes.

### Memory leaks

If a program allocates heap memory and then loses track of it without freeing it, that memory remains reserved but unusable. That is a **memory leak**.

```c
void log_user() {
    char *buffer = malloc(1024);
    if (buffer == NULL) {
        return;
    }

    strcpy(buffer, "user logged in");
    printf("%s\n", buffer);
}
```

This function never frees `buffer`. Run code like this often enough, and memory usage grows. Sometimes that means sluggish software. Sometimes it means a process crashes. Sometimes it means your weekend gets rescheduled.

### Use-after-free

If a program frees a heap block and then continues using the old pointer, that pointer is now stale. The address may refer to memory that has already been returned to the allocator and possibly reused.

```c
char *buffer = malloc(32);
free(buffer);
buffer[0] = 'A';
```

That last line is a **use-after-free**. The program is treating released storage as if it still owns it. Sometimes this crashes. Sometimes it silently corrupts data. Sometimes it becomes a serious security vulnerability because the freed region has been reallocated for something attacker-influenced.

### Double free

If the same heap block is freed twice, the allocator's internal bookkeeping can be corrupted or confused.

```c
char *buffer = malloc(32);
free(buffer);
free(buffer);
```

Allocators are not fond of this. Neither are incident responders.

### Heap overflow

If a program writes beyond the bounds of an allocated heap block, it can corrupt adjacent heap data or allocator metadata.

```c
char *buffer = malloc(8);
strcpy(buffer, "this string is much longer than eight bytes");
```

This is a heap overflow. Same fundamental sin as a stack overflow: writing beyond the storage actually owned. Different region, different consequences, same underlying dishonesty about boundaries.

## Why the heap matters in real systems

Heap allocation shows up whenever software needs flexible data structures: linked lists, trees, caches, parsed documents, network buffers, objects with shared lifetimes, request state that survives across many function calls, and practically every modern application whose memory usage cannot be described with a straight face using only fixed stack frames.

A web server might allocate a request object when a connection arrives, keep it alive while middleware and handlers do their work, and free it after the response is sent. A parser might allocate space for a variable-length input field because the exact size is not known until runtime. A database client may build result objects dynamically based on what comes back from the server. The stack cannot model those lifetimes cleanly, because those lifetimes are shaped by program behavior, not just call nesting.

That is the heap's job.

## Stack versus heap, now in plain English

At this stage, the clean comparison is:

- the stack is structured by function-call order
- the heap is structured by allocation and release decisions

On the stack, lifetime is mostly automatic. Return from the function and the frame goes away.

On the heap, lifetime is usually explicit or runtime-managed. The program, allocator, or garbage collector decides when that storage stops being valid.

That is why the stack feels fast and disciplined, while the heap feels flexible and a little more bureaucratic. The stack says, "we know the order." The heap says, "submit a request and do not lose the paperwork."

## The practical mental model

If you want one durable way to think about the heap, use this:

The heap is where programs keep data that must survive beyond the current function call, but that survival comes with bookkeeping obligations about size, ownership, and lifetime.

That sentence explains a lot.

It explains why returning a pointer to stack memory is wrong.

It explains why allocators exist.

It explains why leaks, use-after-free bugs, double frees, and heap overflows happen.

And it explains why memory-safe languages earn their keep by removing or restricting so much of this manual lifetime management. They are not doing magic. They are adding rules where C historically offered confidence and a shovel.

At the machine level, nothing mystical happened here. We still have bytes at addresses. We still have programs deciding how to interpret them. The heap just adds a new rule: some memory is requested and kept around independently of the stack's call-by-call rhythm.

That one change is enough to make modern software practical and memory management treacherous in equal measure. A very normal computing outcome, honestly.

## What comes next

Now that we have both stack and heap in view, the next lesson is pointers as a first-class idea: not just "variables that store addresses," but the mechanism that lets programs connect data, traverse memory, and occasionally turn one bad assumption into a spectacular bug.
