# 4-Week Account Warmup Checklist

**Mục tiêu:** Đưa Reddit + Shopify Community account của Stella từ 0 karma → 100+ karma + TL2, không bị flag spam, sẵn sàng post Joy mentions từ tuần 5.

**Tổng commitment:** ~20 min/ngày × 5 ngày/tuần = 1.5 hour/tuần.

**Tracker:** Check off từng task. Cuối mỗi tuần update tracker ở cuối file.

---

## Pre-Warmup Setup (làm 1 lần, ~30 min)

```
[ ] Tạo Reddit account, username: stella-joy (hoặc StellaPham_Joy)
[ ] Upload avatar (ảnh thật của Stella, không stock photo)
[ ] Bio: "PMM @ Joy Subscriptions (Shopify subscription app by Avada).
        Helping small merchants with subscription strategy.
        Always disclose affiliation."
[ ] Verify email Reddit
[ ] Tạo Shopify Community account, username: Stella_Joy
[ ] Same bio
[ ] Add Vercel env:
    TEAM_ACCOUNTS_REDDIT="stella=stella-joy:primary"
    TEAM_ACCOUNTS_SHOPIFY="stella=Stella_Joy:primary"
[ ] Re-deploy Vercel
[ ] Seed local: node --env-file=.env.local db/seed-team-accounts.js
[ ] Chạy karma baseline: node --env-file=.env.local scripts/run-karma-snapshot.js
[ ] Mở /reputation → confirm baseline (Reddit ~1 karma, Shopify TL0)
```

---

## TUẦN 1 — Pure Observer + Karma Builder

**Tên gọi:** "Lurk and learn"
**Mục tiêu:** +20-30 karma trên Reddit. TL0 → TL1 trên Shopify Community.
**Quy tắc cứng:** ZERO Joy mention. ZERO subscription topics. Chỉ trả lời câu hỏi rõ ràng dễ.

### Daily routine (15 min/ngày, 5 ngày/tuần)

```
SÁNG (5 min):
[ ] Mở /giveback → filter category "shipping" hoặc "theme" (dễ nhất)
[ ] Pick 1-2 threads dễ trả lời

CLAUDE CODE (5 min):
[ ] Click "✨ Get reply" trên thread đã chọn
[ ] Copy prompt → paste vào Claude Code
[ ] Claude generate reply → review + edit nhẹ để personal hơn

POST (5 min):
[ ] Login Reddit → post reply
[ ] Quay lại /giveback → click "✓ Answered"
```

### Day-by-day Week 1

| Day | Task | Specific |
|-----|------|----------|
| Mon | Reddit: 1 reply (shipping) | Easy ones like "how do I add free shipping bar" |
| Tue | Reddit: 1 reply (theme) | Customization, Liquid basics, free themes |
| Wed | Reddit: 1 reply + 1 upvote 5 helpful posts | Engage broader |
| Thu | Reddit: 1 reply (apps_general, NOT subscription) | Email apps, inventory apps |
| Fri | Reddit: 1 reply (shipping or theme) | Same easy categories |
| Sat | Shopify Community: read 10 topics + 5 replies (passive) | Build TL1 progress |
| Sun | Review week — check /reputation karma trend | Should see 10-30 karma gained |

**End-of-week target:**
- ✅ Reddit karma: 20-30
- ✅ Shopify Community: TL0 → TL1
- ✅ 5 giveback replies marked answered
- ✅ Bio + avatar set
- ✅ ZERO posts mentioning Joy

### Week 1 disclosure rule

> Nếu bị hỏi "what do you do?" trong reply chain — OK trả lời:
> "I work in the Shopify app space at Avada — happy to help here purely as a peer."
> KHÔNG nói "Joy Subscriptions" cụ thể trong tuần 1.

---

## TUẦN 2 — Consistent Giveback + Soft Profile

**Tên gọi:** "Build the habit"
**Mục tiêu:** +30-40 karma thêm (cumulative ~60). Bắt đầu được nhận diện ở r/shopify.
**Quy tắc:** ZERO Joy mention. Có thể mention Avada nếu DIRECTLY hỏi.

### Daily routine (20 min/ngày)

Same as Week 1 + thêm 1 task mới:

```
SÁNG: 1 giveback reply (như cũ)

CHIỀU/TỐI (10 min mới):
[ ] Mở /giveback → filter category KHÁC (đa dạng hóa)
[ ] Pick 1 thread medium difficulty
[ ] Reply với expert framing (không generic answer)
```

### Day-by-day Week 2

| Day | Task |
|-----|------|
| Mon | 2 replies — shipping + payment |
| Tue | 2 replies — theme + marketing (Klaviyo, email) |
| Wed | 2 replies — apps_general + inventory |
| Thu | 2 replies — discount + seo |
| Fri | 1 reply + browse r/shopify hot 15 min, comment 3 thoughtful replies |
| Sat | Shopify Community: 5 replies on non-subscription topics |
| Sun | Review week — chạy `npm script` karma snapshot manually nếu chưa có cron |

**End-of-week target:**
- ✅ Reddit karma: 50-70
- ✅ Shopify Community: TL1 stable, working toward TL2
- ✅ 10+ giveback replies in DB
- ✅ Profile có ít nhất 5 replies với positive upvotes (1+ upvote each)
- ✅ Vẫn ZERO Joy mention

### Week 2 self-check

Hỏi bản thân: nếu một merchant vào profile của Stella, họ thấy gì?
- ✅ Helpful Shopify peer
- ✅ Real opinions, không generic
- ❌ KHÔNG được thấy: pattern "this person only posts to promote something"

---

## TUẦN 3 — Subscription-Adjacent (Still No Joy)

**Tên gọi:** "Domain expert mode"
**Mục tiêu:** +30-40 karma (cumulative ~90-100). Position Stella như subscription expert WITHOUT pitching.
**Quy tắc:** Có thể trả lời subscription threads BẰNG `helpful_only` tone — KHÔNG mention Joy.

### Daily routine (20 min/ngày)

```
SÁNG (10 min):
[ ] Mở / (Today dashboard) → filter "Drafts ready"
[ ] Pick 1-2 subscription threads RELEVANT
[ ] Click vào thread → click "Generate drafts" trong Claude Code
[ ] Use ONLY Draft 1 (helpful_only) — bỏ qua Draft 2, 3 tuần này

CHIỀU (10 min):
[ ] /giveback — 1 karma reply như cũ (duy trì 1 helpful_only/day)
```

### Day-by-day Week 3

| Day | Task |
|-----|------|
| Mon | 1 subscription thread (helpful_only) + 1 giveback |
| Tue | 1 subscription thread (helpful_only) + 1 giveback |
| Wed | 2 giveback (skip subscription nếu không có thread chất lượng) |
| Thu | 1 subscription thread (recommend_alternatives draft — gợi ý competitor honestly) + 1 giveback |
| Fri | 1 subscription thread (helpful_only) + browse / mark engaged trên dashboard với tone đúng |
| Sat | Off |
| Sun | Review /reputation + /stats — kiểm tra ratio tracker |

**Quan trọng cho Week 3:** mỗi lần engage subscription thread → quay lại dashboard → click thread → "I posted this" → chọn `tone: helpful_only`. Đảm bảo dashboard tracking đúng.

**End-of-week target:**
- ✅ Reddit karma: 90-120
- ✅ Reaching the **100+ karma threshold** — badge "100+ karma ✓" xuất hiện trên /reputation
- ✅ Shopify Community: TL2 attained
- ✅ At least 3 subscription threads engaged với helpful_only
- ✅ 0 pitch ratio (vì chưa có pitch nào)

### Week 3 milestone check

```
[ ] Mở /reputation → karma >= 100? Nếu chưa, KÉO DÀI Week 3 thêm 3-5 ngày trước khi sang Week 4
[ ] Mở /stats → see "engaged" count > 5
[ ] Random check: search Reddit "site:reddit.com stella-joy" → có hits không?
```

> **Nếu karma < 100 sau Week 3:** đừng vội. Reddit auto-mod sẽ filter Joy mentions từ low-karma accounts. Lùi Week 4 lại đến khi vượt threshold.

---

## TUẦN 4 — First Joy Disclosures

**Tên gọi:** "Soft launch"
**Mục tiêu:** First 2-3 Joy mentions, 100% disclose, helpful-first. Bắt đầu compound effect.
**Quy tắc:** Tuần đầu mention Joy. Max 1-2 mentions/tuần. Đảm bảo ratio < 30% pitch ngay từ đầu.

### Daily routine (20 min/ngày)

```
SÁNG (10 min):
[ ] Mở / → filter "Drafts ready" hoặc "New" + "🔥 hot"
[ ] Pick 1 thread WHERE Joy is GENUINELY relevant
   (rule: nếu draft 2 không tự nhiên / phải gượng ép, dùng draft 1 thay thế)
[ ] Click "Generate drafts" via Claude Code

REVIEW (5 min):
[ ] Đọc Draft 2 (helpful_with_joy_mention) — có cảm thấy salesy không?
[ ] Edit để personal: thêm 1 cau chuyện thật, hoặc thêm caveat "but Joy may not fit if..."
[ ] Đảm bảo disclose ngay câu đầu

POST (5 min):
[ ] Post Reddit
[ ] /threads/[id] → "I posted this" → tone: helpful_with_joy_mention
[ ] Check /reputation pitch ratio meter — phải < 30%
```

### Day-by-day Week 4

| Day | Task | Tone target |
|-----|------|-------------|
| Mon | 1 subscription engage + 1 giveback | helpful_only + giveback |
| Tue | 1 subscription engage + 1 giveback | recommend_alternatives + giveback |
| Wed | **FIRST JOY MENTION** — 1 thread carefully picked | helpful_with_joy_mention |
| Thu | 1 giveback only (rest day cho Joy thread Wed) | giveback |
| Fri | 1 subscription engage | helpful_only |
| Sat | Off |
| Sun | Review week + plan Week 5 |

**End-of-week target:**
- ✅ Reddit karma: 130-180 (gain từ helpful posts có upvote)
- ✅ 1-2 Joy mentions, mỗi cái có disclose
- ✅ Pitch ratio meter trên dashboard < 30% (1 pitch / 4-5 helpful = 20-25%)
- ✅ KHÔNG có comment Joy nào bị remove bởi mod
- ✅ Ít nhất 1 Joy mention được upvote (validates community accepts)

### Week 4 self-check

```
[ ] Đọc lại 2 Joy mentions của tuần này — có sounds organic không?
[ ] Có ai comment phản ứng tiêu cực không?
[ ] /reputation: karma trend đang positive (không có dip lớn = không bị downvote bomb)
[ ] /mentions: có ai mention u/stella-joy organically không? (low base rate, đừng kỳ vọng nhiều)
```

---

## Anti-Patterns (NEVER DO)

```
❌ Tạo nhiều accounts để upvote nhau (sock puppets) — Reddit detect ngay
❌ Post cùng comment lên nhiều subreddits cùng lúc
❌ Reply pattern: chỉ comment ở subscription threads, ignore tất cả khác
❌ Link đến joysubscription.com trong comment (auto-mod sẽ filter)
❌ Mention Joy trong title của post của riêng mình
❌ Vote brigading (kêu team upvote post của Stella)
❌ DM merchants offering Joy unsolicited
❌ Edit comment sau khi post để add Joy mention (Reddit shows edit history)
❌ Post Joy mention từ account < 30 ngày HOẶC < 100 karma
❌ Sử dụng "industry-leading", "powerful", "seamless" — ai cũng biết là marketing copy
```

---

## Disclosure Templates (use 1 of these every Joy mention)

### Standard
> "Hey, Stella from Joy Subscriptions (Shopify subscription app) here — happy to share thoughts as a peer..."

### Self-aware
> "Disclosure: I'm Stella, PMM at Joy Subscriptions. So take this with that lens, but here's what I've seen work for stores like yours..."

### Honest comparison
> "Hey, Stella @ Joy Subscriptions here. For your case, [Competitor X] might actually be better fit because [reason]. If you do want to compare, here's how I think about it..."

### Anti-template (avoid)
> "As an expert at Joy Subscriptions..."  ← sounds corporate
> "Joy Subscriptions can solve this..."   ← pitch-first, not help-first
> "Check out our app at joysubscription.com" ← link spam trigger

---

## Weekly Tracker

Cuối mỗi tuần, update bảng này để track progress + làm baseline cho future warmup khác (Philip, CS team).

| Week | Reddit karma start | end | Δ | TL Shopify | Giveback replies | Subscription engages | Joy mentions | Notes |
|------|-------------------|-----|---|-----------|------------------|---------------------|--------------|-------|
| 1    | 1                 |     |   | TL0       |                  | 0                   | 0            |       |
| 2    |                   |     |   |           |                  | 0                   | 0            |       |
| 3    |                   |     |   |           |                  |                     | 0            |       |
| 4    |                   |     |   |           |                  |                     | 1-2          |       |

---

## Red Flags — Khi nào pause warmup

- **Account bị shadowban** (posts không hiện cho người khác — check via `https://www.reddit.com/user/stella-joy` từ incognito)
- **Bị mod ban khỏi subreddit** → kéo dài warmup ở subreddit khác trước khi quay lại
- **Comment bị remove bởi auto-mod** 2+ lần liên tiếp → check rule subreddit, có thể cần karma cao hơn
- **Negative karma trend** (downvotes > upvotes) → tone có vấn đề, review prompt
- **0 upvotes sau 5+ helpful replies** → câu trả lời generic quá, cần specific hơn

Khi gặp red flag → pause 1 tuần, không post → review pattern, adjust → resume.

---

## After Week 4 — Steady State

Tuần 5+, transition sang routine của [USAGE.md § 7](./USAGE.md) (15-20 min/ngày). Compound effect bắt đầu kick in từ tuần 8-12 khi:

- Reddit karma > 300 → posts get more visibility (Reddit algorithm)
- Có 2-3 Joy mentions được upvote 5+ → social proof tự nhiên
- /mentions dashboard bắt đầu có hits (others mention Joy mà không phải Stella)
- AEO impact: ChatGPT bắt đầu pick up references trong 8-12 tuần (re-run HubSpot AEO Grader để verify)

**Goal score 12 tuần:** HubSpot ChatGPT AEO 41 → 55+ (per AEO action plan).
