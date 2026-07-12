---
title: "Blast radius is a design parameter, not a disaster measure"
date: 2026-07-12 13:20:00 -0400
categories: [articles]
tags: [blast-radius, security-engineering, segmentation, least-privilege, systems-design, incident-response, architecture]
summary: "How far a breach travels is not determined during incident response — it is fixed months earlier by segmentation decisions, credential scope, and which services share trust, making blast radius a design constraint that belongs on architecture reviews, not only post-incident reports."
---

Every significant incident ends with a scope diagram: a map of what got touched, which credentials were used, which services were accessed, how far the breach traveled before someone noticed. The diagram is usually produced in the forty-eight hours after the incident is contained, and it is almost always accurate in both the forensic sense and the uncomfortable sense — everything on the diagram was reachable by design.

The phrase "blast radius" appears in post-incident reviews as a measure, something you discover once the dust settles. But blast radius is not an outcome. It is a parameter, set earlier, by decisions that nobody labeled as security decisions at the time.

## What a blast radius actually is

When a component is compromised — a service account leaked, a server owned, a database credential phished — the blast radius is the set of things that component can affect. Not the set of things it normally touches, or the set of things the developer intended it to touch. The set of things it *can* touch, given the permissions and trust relationships that were configured for it.

This distinction is where most blast radius confusion lives. A web service that normally reads one table from one database, but whose service account has read access to every table in the cluster, has a blast radius that includes every table in the cluster. The normal behavior is irrelevant once the service is compromised. At that point, the normal behavior is what the attacker does not want.

Blast radius is set by structure, not by intent. The intent was probably fine.

## The three decisions that set it

Three design-time choices determine most of a component's blast radius in practice.

**Credential scope.** A service account that can read, write, and delete across many resources has a large blast radius regardless of how carefully the code uses it. An attacker who gains control of the service process inherits the full credential, not just the code paths that were tested. The blast radius of a leaked credential is the entire permission set attached to it, minus whatever an attacker cannot figure out how to use — which is a poor kind of defense to be relying on.

**Network segmentation.** If a compromised web tier can reach a payment database directly because "they are both internal," the blast radius of a web tier compromise includes the payment database. If the web tier can only reach a payment API, and the payment API enforces its own authentication, the blast radius is smaller and the payment database is behind an additional trust check. Network reachability is not just a performance decision. It is a statement about what a compromised component has access to by default.

**Shared infrastructure.** When multiple services share a database, a queue, a secret store, or a message broker, compromising any one of them means reaching infrastructure that serves all of them. A shared cache that holds session tokens from a hundred services becomes a single point with a blast radius that spans all hundred services. The blast radius of a breach at the infrastructure layer includes everything that trusts the infrastructure, which is often more than the original scope diagram suggests.

None of these are exotic misconfigurations. They are the natural outcome of building systems where convenience is the default and security segmentation is treated as something to add later, once the architecture is stable.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    subgraph flat["Flat architecture"]
        A1["Compromised service"] --> B1["Database A"]
        A1 --> C1["Database B"]
        A1 --> D1["Secret store"]
        A1 --> E1["Payment API"]
    end
    subgraph segmented["Segmented architecture"]
        A2["Compromised service"] --> B2["API gateway"]
        B2 --> C2["Payment API (auth required)"]
        B2 -. "no route" .-> D2["Internal databases"]
    end
  </div>
  <figcaption>Same entry point, different blast radius. The compartment boundaries are architectural decisions made before the incident.</figcaption>
</figure>

## Detection speed and blast radius are independent variables

The most common source of confusion about blast radius is treating it as a problem that detection solves. "If we detect the breach fast enough, it won't spread" conflates two separate questions: how far can this breach travel, and how quickly will we notice it has traveled.

A breach in a flat, over-permissioned network that is detected in five minutes can still touch everything the compromised credentials can reach in those five minutes, which in many systems is most of the environment. A breach in a well-segmented, least-privileged architecture that takes twelve hours to detect may be fully contained to one compartment for all twelve hours, because the compartment boundaries do not care what time it is.

Detection and containment are both valuable. They are not the same control, and they do not substitute for each other. Teams that invest heavily in detection while leaving blast radius unaddressed are installing smoke alarms in a building where all the walls are also doors.

Containment during incident response means executing the actions that limit spread. But those actions only work if the architecture has something to execute against — a credential to revoke that actually isolates the component, a segment with enforced boundaries, a service that cannot reach others without explicit authority. If the architecture has no compartments, "contain" is a word in a playbook with nothing to operate on.

## Blast radius as a design constraint

The change this requires is treating blast radius as a property you specify and verify at design time, not one you discover afterward.

For any component in a system, the useful question is: *if this component were fully compromised — not temporarily misbehaving, but completely under attacker control — what is the worst-case set of things an attacker gains access to?*

That question is often answered optimistically. The answer is not "the services this component normally calls." The answer is "every service this component's credentials can reach, every network destination it can connect to, every shared resource its process can read or write." The credential is not compromised to normal behavior. It is compromised to its limits.

Taking that question seriously as a design constraint produces different decisions than taking it seriously only as a post-incident observation. Credentials get scoped to their actual minimum. Network paths get trimmed to what the service needs, not what the subnet allows. Shared infrastructure gets evaluated not only for efficiency but for what it means if one consumer is malicious rather than merely buggy.

## Where the debt accumulates quietly

A few places where blast radius tends to grow without being noticed:

**Service accounts created once and inherited.** An account created with broad permissions for a quick task, or copied from a template, often becomes a permanent credential with scope much wider than anything the current service uses. The permissions stay because deleting them takes an audit, and audits wait for the next quarter. The blast radius waits with them.

**"Internal" trust that became transitive.** Once two services are both labeled "internal," they often end up with trust that extends to their dependencies, their logs, their caches. A breach in service A reaches service B not because they share credentials but because they share infrastructure that treats both as equally trusted. The trust boundary expanded without anyone drawing the new boundary on a diagram.

**Cloud IAM policies written for speed.** A wildcard action, a `*` resource, a role assumed by everything in a namespace — each of these is a choice that made development faster and blast radius larger at the same time. The blast radius implications often do not surface until the policy is exercised by an attacker instead of by the expected caller.

**Flat networks between "separate" environments.** When staging and production are on the same VPC with permissive security group rules, a breach in staging has a blast radius that includes production. The environments are logically separate. Architecturally, they share a room with an unlocked connecting door.

## The audit question that catches most real systems

A practical way to surface blast radius without a full architecture review is to ask, for every service account and role in a system, one question:

*What would an attacker concretely gain — in terms of data readable, actions executable, and services reachable — if this credential were in their hands right now?*

The answer is not what the service does. The answer is what the service's permissions allow. Map the answer to a list of actual consequences. If the list is longer or more consequential than you expected for what this service is supposed to do, that gap is the blast radius you did not mean to build but built anyway.

Most over-permissioned credentials in production are not the result of a deliberate decision. They are the result of no decision — a default, a copied example, a constraint that no longer applies, or a permission added during an incident to stop the bleeding and never removed after the bleeding stopped.

## A useful design test

For any component or service boundary in a system:

1. If this component were fully compromised, what credentials, network paths, and shared resources does an attacker inherit — and what can they reach with those?
2. What is the blast radius in terms of data, services, and infrastructure — not what this component normally touches, but what it *can* touch?
3. What would it take to shrink that blast radius by half: fewer permissions, narrower network access, a shared resource that could be isolated per consumer?
4. When this component's credentials are rotated or revoked, does it actually lose access immediately, or does a cached grant or session keep working past the revocation?
5. Are the segmentation boundaries between this component and its neighbors enforced by the architecture, or only by a convention that a future engineer, a retry path, or a sufficiently creative bug could violate?

The fifth question is the sharpest. Segmentation enforced only by well-behaved code is not segmentation. It is an agreement among current engineers that a future engineer, an attacker, or a sufficiently motivated bug is being invited to revisit.

## Treat containment as an architectural property

Security engineering is good at defining what is allowed. It is less consistent about defining what is reachable when something that was allowed becomes something that is compromised.

Blast radius is that second question. It is not answered by access control lists alone, because access control lists describe the happy path. They do not describe what happens when the component that holds the credential is the thing that breaks. For that, the answer comes from segmentation, from minimal credential scope, from the discipline of asking "what is the worst case if this component is fully hostile" at design time instead of at post-mortem time.

Incidents are forensics. Blast radius design is engineering. Both are necessary. But only one of them gets to choose the constraints that the other operates within. Design the small compartments first. Let the incident response team inherit a system where "contain" is an action that has something to act on.

The diagram in the post-incident report will reflect the decisions made months before the incident. The only way to change what that diagram looks like is to change those decisions while they are still decisions, rather than history.
