# NANDA Index — landing & FAQ

A small static site that explains the NANDA Index (the why, what and how) plus a FAQ, built in the
Swiss/editorial style of the NANDA Hack site.

## Pages

- `index.html` — landing page: why DNS is not enough, what the index is (lean record + verifiable
  AgentFacts, the five guarantees, the quilt), how it works (the three-layer architecture), and links
  to the papers and prior work.
- `faq.html` — 15 questions across four groups: the basics, architecture, trust and privacy, and
  ecosystem and usage.
- `styles.css` — shared design system.

## Design

- Fonts: Neue Haas Grotesk Display Pro (display), JetBrains Mono (mono), Inter.
- Palette: white `#FFFFFF` / paper `#F6F6F4`, ink `#0E0E0E`, muted `#6b6258`, brand yellow `#F2C400`,
  HCL blue `#0066D6`, MIT red `#A31F34`.
- Dotted-grid background, thin rules, sharp corners, uppercase tracked labels.

## Run locally

It is plain static HTML, so any static server works:

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321/.

## Background

Content is drawn from the NANDA Index papers:

- Beyond DNS: Unlocking the Internet of AI Agents via the NANDA Index and Verified AgentFacts —
  https://arxiv.org/abs/2507.14263
- Using the NANDA Index Architecture in Practice: An Enterprise Perspective —
  https://arxiv.org/abs/2508.03101
- Project NANDA — https://projectnanda.org

For research and discussion. v0.3, request for comments.
