---
title: "Metabase turns a merge bug into unauthenticated admin access"
date: 2026-08-18 13:55:00 -0400
categories: [news]
tags: [metabase, cve-2026-72898, sql-injection, kev, business-intelligence, credential-exposure, saas-security]
summary: "CVE-2026-72898 shows how an undocumented JSON field, a permissive Clojure merge, and a query builder's literal-SQL escape hatch combined into unauthenticated database admin access — and why a BI tool's blast radius is every credential it holds for you."
---

On August 6, 2026, Metabase disclosed `CVE-2026-72898`, an unauthenticated SQL injection in the password-reset endpoint of its open-source business intelligence platform, carrying the maximum possible CVSS score of 10.0. CISA added it to the Known Exploited Vulnerabilities catalog five days later, on August 11, with a remediation deadline of August 14. That deadline has already passed. The detail worth sitting with is not the score — a 10.0 is a data point, not an argument — it's that the exploitation predates the disclosure. Metabase's own advisory and subsequent incident reports place attacker activity against Metabase Cloud in early August, days before a patch existed. This was a zero-day in the literal sense: attackers had it before defenders had a name for it.

Metabase is a self-hosted or cloud-hosted analytics tool that sits on top of an organization's actual data — Postgres instances, data warehouses, production replicas — and holds the credentials needed to query them. That positioning is exactly why this bug matters beyond the Metabase user base. Admin access to a Metabase instance is not admin access to a dashboard. It's admin access to every data source that dashboard was ever pointed at.

## The bug, precisely

The vulnerable endpoint is `/api/session/reset_password`, which normally accepts a reset `token` and a new `password`. The root cause is that Metabase's request handler did not restrict the JSON body to those two fields. An attacker could add an undocumented third field — `user-id` — and the value did not have to be an integer. Security researchers who reverse-engineered the patch found that supplying `{"user-id": {"raw": "<SQL>"}}` as that field's value was enough to reach the database layer as a live query fragment instead of a sanitized identifier.

Two implementation choices made that payload dangerous rather than merely rejected. First, Metabase's authentication-flow code uses Clojure's `merge` function to combine the incoming request map with an internal defaults map; `merge` overwrites matching keys but does not strip keys it doesn't recognize, so the attacker-supplied `user-id` survived into the code path even on a failed-auth branch. Second, when that JSON key was parsed into a Clojure keyword and handed to HoneySQL — the query-building library Metabase uses — the `:raw` keyword is a documented directive meaning "treat this string as literal SQL, don't parameterize it." That's a legitimate escape hatch for hand-written query fragments elsewhere in the codebase. Here, it was reachable from unauthenticated user input. The result is a query that runs attacker-controlled SQL wherever an integer user ID was expected, no credentials, no prior session, no user interaction. Researchers trace the flaw back to version 1.58, introduced during an authentication-module refactor — meaning it sat live in shipped releases long before anyone noticed a request could carry a field the API never documented.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Unauthenticated POST to /api/session/reset_password"] --> B["JSON body includes undocumented user-id field"]
    B --> C["Clojure merge combines request map with defaults, does not strip unknown keys"]
    C --> D["user-id value {raw: SQL} parsed into Clojure keyword"]
    D --> E["HoneySQL treats :raw as literal-SQL directive, skips parameterization"]
    E --> F["Attacker SQL executes against Metabase application database"]
    F --> G["Attacker grants themselves administrator privileges"]
    G --> H["Admin session exposes credentials for every connected data source"]
  </div>
  <figcaption>Each step is individually defensible engineering — a convenience merge, a query-builder escape hatch — and the combination produces unauthenticated root.</figcaption>
</figure>

## Who this actually hit

Metabase Cloud tenants Framework, Anaconda, and n8n have each disclosed unauthorized access to customer data traceable to the pre-patch exploitation window. n8n's disclosure specified the scope precisely: 136 customer records exposed, including five bcrypt-hashed passwords. Framework's disclosure named customer names, IP addresses, and physical addresses among the exposed fields. These are not hypothetical impact statements pulled from a CVSS vector string — they're companies that had to notify their own customers because a dashboard vendor's password-reset endpoint had an undocumented field.

That's the shape of the exposure worth internalizing: a SQL injection in a BI tool doesn't just leak whatever the BI tool stores about itself. Metabase stores connection credentials for every downstream data source an organization has wired up, precisely because its entire value proposition is querying across those sources. Admin takeover converts into read access — and, per Metabase's own advisory, into credential theft — for whatever databases were connected, and export capability for whatever those databases contained. Treating this as "a Metabase incident" undersells it the same way treating a compromised identity provider as "an SSO incident" would.

## Scale and timeline

Independent scanning cited by researchers puts around 2,500 Metabase instances directly reachable on the public internet via Shodan, on top of an unknown number of Metabase Cloud tenants and internally-hosted instances behind VPNs or SSO that scanners can't see. Affected version ranges span the 0.58/1.58 through 0.63.4/1.63.4 branches — effectively every release since the vulnerable refactor landed. Fixed versions are branch-specific: 0.58.24, 0.59.21, 0.60.17, 0.61.11, 0.62.9, and 0.63.5, with matching 1.x Enterprise Edition builds.

The timeline compresses the usual advisory-to-exploitation gap into almost nothing. Metabase's own incident notes describe attacker activity against Metabase Cloud in an approximately four-hour window on August 2 — four days before any public advisory existed. Metabase published its GitHub Security Advisory on August 6 without a CVE identifier attached; MITRE assigned `CVE-2026-72898` four days later, on August 10. CISA's KEV addition followed on August 11 with an August 14 remediation deadline for federal agencies under Binding Operational Directive 22-01. For an unauthenticated, CVSS-10.0, actively-exploited SQL injection, a three-day KEV clock is standard procedure — the unusual part is that the clock started after the exploitation, not before it.

Researchers scanning cloud environments estimate that self-hosted Metabase shows up in roughly 13% of the environments they surveyed, and that around a quarter of those self-hosted instances are fully internet-accessible rather than sitting behind a VPN or SSO gateway. Combine that with the Shodan count and the picture is an install base large enough that "someone else patched this by now" is not a safe assumption for any given instance, including yours.

## Why this keeps happening

The specific mechanism here — an undocumented request field surviving a permissive merge, then reaching a query builder's literal-SQL directive — is idiosyncratic to Metabase's Clojure codebase. But the general shape is not new, and it is not going away: an API's actual accepted-input surface is broader than its documented surface, and the gap between the two is exactly where validation logic doesn't look. Schema validation that allowlists expected fields at the boundary would have stopped this regardless of what happened downstream in the query builder. Validating structure at the edge, rather than trusting internal functions to fail safely on malformed input, is the durable lesson, independent of which language or ORM a given vendor happens to use.

## What to do about it

Start with inventory, and don't stop at "do we run Metabase." Enumerate every instance — self-hosted, cloud-hosted, and any spun up by a team outside central IT's visibility, since analytics tools are exactly the kind of software that proliferates through individual team purchases. For each instance, record the exact version string; the patch is branch-specific, so "we updated Metabase" is not verification, "we're running 0.63.5 or later on this instance" is.

Patch every instance to its branch's fixed release. If an instance can't be patched immediately, the compensating control is restricting network reachability to `/api/session/reset_password` — but treat that as a stopgap measured in hours, not a substitute for patching, given that exploitation here preceded public disclosure.

Then go past patching, because admin takeover means the compromise isn't necessarily contained by fixing the entry point. Audit Metabase's admin user list for accounts that don't map to known personnel — the exploit's endpoint state was to grant the attacker administrator privileges directly. Review audit logs, where available, for data export activity and configuration changes in the exploitation window, particularly around early August. And treat every credential Metabase held for a downstream data source as potentially exposed: rotate database credentials, API keys, and any connection secrets configured in that instance, rather than assuming the blast radius stopped at the Metabase application database itself.

For hunting specifically, pull web server or reverse proxy logs for requests to `/api/session/reset_password` and look for bodies containing keys beyond `token` and `password` — any `user-id` field, especially one carrying a JSON object rather than a plain integer, is a strong indicator of exploitation attempts regardless of whether they succeeded. Because the endpoint is unauthenticated by design, normal auth-failure alerting won't catch this; you're looking for request-body shape, not failed logins. If logs don't go back far enough to cover early August, treat the instance as compromised-until-proven-otherwise rather than assuming a clean bill of health from the absence of evidence.

Finally, use this as the forcing function for a question worth asking about every BI, ETL, or reporting tool in the environment: does its criticality tier reflect what it actually has access to, or just what it's nominally used for? A tool categorized as "internal reporting dashboard" and a tool that holds live credentials to production data warehouses are, from an attacker's perspective, the same asset. Inventory and access review processes that treat them differently are measuring the wrong thing.

## Sources

Primary advisory: [Metabase, "SQL injection using an unauthenticated endpoint leading to admin access"](https://github.com/metabase/metabase/security/advisories/GHSA-vwf4-m7j8-wcjf), GitHub Security Advisory GHSA-vwf4-m7j8-wcjf, published August 6, 2026.

Primary CISA source: [CISA, "CISA Adds Three Known Exploited Vulnerabilities to Catalog"](https://www.cisa.gov/news-events/alerts/2026/08/11/cisa-adds-three-known-exploited-vulnerabilities-catalog), released August 11, 2026.

CVE record: [NVD, "CVE-2026-72898 Detail"](https://nvd.nist.gov/vuln/detail/CVE-2026-72898).

High-signal reporting on exploitation, disclosure timeline, and confirmed victims: [The Hacker News, "Metabase Zero-Day Exploited in Wild Allows Admin Access Without Authentication"](https://thehackernews.com/2026/08/metabase-zero-day-exploited-in-wild.html), published August 2026.

Technical root-cause analysis of the merge and query-builder chain: [Bishop Fox, "Critical SQL Injection in Metabase via Password Reset: CVE-2026-72898"](https://bishopfox.com/blog/critical-sql-injection-in-metabase-via-password-reset-cve-2026-72898); [Wiz, "Inside the Metabase SQLi: Exploited in the Wild"](https://www.wiz.io/blog/inside-the-metabase-sqli-exploited-in-the-wild).

Additional technical background: [Horizon3.ai, "Metabase SQL Injection: CVE-2026-72898"](https://horizon3.ai/attack-research/vulnerabilities/cve-2026-72898/).
