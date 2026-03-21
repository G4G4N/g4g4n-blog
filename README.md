# G4G4N Blog

This repository is the GitHub Pages source for `https://blog.g4g4n.com`.

## What this repo is for

- `g4g4n.com` stays your portfolio site in `g4g4n.github.io`
- `blog.g4g4n.com` becomes your writing site in this separate repo
- posts live in `_posts/` so Codex can create one file per day

## GitHub setup

1. Create a new public repository, for example `g4g4n-blog`.
2. Push this folder to the new repository on branch `main`.
3. In the repository settings, open `Pages`.
4. Set `Source` to `GitHub Actions`.
5. Let the `Deploy GitHub Pages` workflow run once.
6. In `Pages`, confirm the custom domain is `blog.g4g4n.com`.

The `CNAME` file is already committed in this repo, so GitHub Pages will pick up the custom domain.

## DNS record

Add this DNS record at your registrar or DNS provider:

- type: `CNAME`
- host/name: `blog`
- value/target: `G4G4N.github.io`

Do not buy the subdomain separately. You already own it as part of `g4g4n.com`.

## Writing

Create a post with:

```bash
./scripts/new_post.sh "My post title"
```

That creates a Markdown file in `_posts/`.
