# Marketing

Content for Cooachly and Cooachly Arts. None of it is part of the app build.

| Path | What |
|---|---|
| `../.claude/brand-voice-guidelines.md` | Voice guides for both brands: We Are / We Are Not, message pillars, tone by channel, terminology, colours, open questions. `/brand-voice:enforce-voice` loads this file automatically. |
| `flyers/*.png` | 1080×1350 flyers (Instagram, Facebook, WhatsApp) |
| `flyers/*.pdf` | Print-ready versions of the same flyers |
| `flyers/html/` | Generated HTML source of each flyer |
| `flyers/build-flyers.cjs` | Rebuilds every flyer (copy, QR codes with UTM links, rendering). See the header for how to run it. |
| `social-posts/sample-batch-nov-2026.md` | Two-week post batch (14 posts), reply templates for comments/DMs, posting calendar |

**Before publishing:** links and QR codes point to the live site, `https://cooachly.com`. Never describe sessions as "recorded": they're transcribed as text only. If AI summaries (`DAILY_ENABLE_TRANSCRIPTION`) are off in production, remove the AI-summary bullet from flyers and posts.
