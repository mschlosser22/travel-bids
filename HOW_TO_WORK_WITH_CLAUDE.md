# How to Work with Claude on Travel Bids

## 🎯 Ensuring Claude Follows the Master Plan

### Method 1: Reference the Plan (Every Time)
Start your requests with:
```
"Refer to PROJECT_MASTER_PLAN.md - let's work on [feature]"
```

Examples:
- "Refer to PROJECT_MASTER_PLAN.md - set up the Next.js project for Phase 1"
- "Check PROJECT_MASTER_PLAN.md section 3B - help me build the AI market discovery agent"
- "Following the master plan, create the database schema from section 6"

### Method 2: .clinerules File (Automatic)
✅ **Already created!** The `.clinerules` file in this directory is automatically read by Claude Code at the start of every session. It tells Claude to:
- Always consult PROJECT_MASTER_PLAN.md
- Follow the tech stack exactly
- Stay within current phase unless told otherwise
- Maintain code quality standards

### Method 3: Phase-Based Requests
Specify which phase you're working on:
```
"Let's start Phase 1 - set up Next.js and Supabase"
"Moving to Phase 2 - add Stripe payment integration"
```

---

## 📁 Key Files for Claude

### Files Claude Should ALWAYS Reference:
1. **PROJECT_MASTER_PLAN.md** - Complete architecture, phases, tech stack
2. **.clinerules** - Project rules and constraints (auto-loaded)
3. **.claude-context.md** - Current phase and quick reference

### Files You Should Keep Updated:
- **.claude-context.md** - Check off completed tasks, update current phase
- **PROJECT_MASTER_PLAN.md** - Update if major architectural decisions change

---

## 🗣️ Example Conversation Starters

### Starting a New Session
```
"Let's continue building Travel Bids. What phase are we on?"
```
Claude will check .claude-context.md and tell you.

### Beginning Phase 1
```
"Refer to PROJECT_MASTER_PLAN.md - let's start Phase 1.
First, initialize the Next.js project with TypeScript."
```

### Building a Specific Feature
```
"Following the master plan section 3B, help me build the
AI market discovery agent that scans Ticketmaster for events."
```

### Asking About Architecture
```
"Before I build the booking flow, show me the relevant database
schema from PROJECT_MASTER_PLAN.md section 6"
```

### When Deviating from the Plan
```
"I know this isn't in Phase 1, but can we add Stripe payments now?
What dependencies do we need from Phase 1 first?"
```

---

## ✅ Best Practices

### DO:
- ✅ Reference PROJECT_MASTER_PLAN.md in your first message of each session
- ✅ Work through phases sequentially (unless you explicitly want to skip ahead)
- ✅ Ask Claude to check the master plan if you're unsure about architecture
- ✅ Update .claude-context.md when you complete phase tasks
- ✅ Ask Claude to update PROJECT_MASTER_PLAN.md if plans change significantly

### DON'T:
- ❌ Assume Claude remembers previous sessions (always re-reference the plan)
- ❌ Ask for tech stack changes without discussing impact on master plan
- ❌ Build features from later phases without checking dependencies
- ❌ Forget to commit .clinerules and PROJECT_MASTER_PLAN.md to git

---

## 🔄 Workflow Example

### Session 1: Project Setup
```
You: "Refer to PROJECT_MASTER_PLAN.md - let's start Phase 1.
      Initialize Next.js with TypeScript and all the dependencies."

Claude: [Reads master plan, sets up project with exact tech stack]

You: "Great! Now create the Supabase project and deploy the
      database schema from section 6."

Claude: [Creates schema SQL file from master plan]
```

### Session 2: Building Features (Next Day)
```
You: "Continuing Travel Bids - refer to PROJECT_MASTER_PLAN.md.
      Let's build the hotel listing page."

Claude: [Reads plan, checks Phase 1 requirements, builds feature]

You: "Add UTM tracking like described in section 1."

Claude: [Implements tracking per master plan specs]
```

### Session 3: Moving to Next Phase
```
You: "Check .claude-context.md - are we done with Phase 1?"

Claude: "Almost! Still need: [lists incomplete tasks]"

You: "Let's finish those, then move to Phase 2."

Claude: [Completes Phase 1, updates context file, begins Phase 2]
```

---

## 🆘 If Claude Forgets the Plan

If Claude seems to be deviating from the architecture:

```
"Stop - refer back to PROJECT_MASTER_PLAN.md section X.
We're using [correct approach] not [what Claude suggested]."
```

Or:

```
"Check .clinerules - does this align with our tech stack?"
```

---

## 📊 Tracking Progress

### Check Phase Progress
```
"Show me Phase 1 checklist from PROJECT_MASTER_PLAN.md"
```

### Update Progress
```
"We completed hotel listing page. Update .claude-context.md
and check off that task in the master plan."
```

### See What's Next
```
"What's the next item in our current phase?"
```

---

## 🎓 Pro Tips

1. **Always start with context:** Even if it's a new day, begin with "Continuing Travel Bids project..."

2. **Be specific about sections:** "Section 3B of the master plan" is better than "the AI stuff"

3. **Use phases as milestones:** "Let's finish Phase 1 before moving on" keeps things organized

4. **Ask Claude to explain:** "Why does the master plan recommend PostHog over building custom analytics?"

5. **Iterate on the plan:** "The master plan says X, but I think Y would work better. What are the tradeoffs?"

---

## 🔐 Keeping Secrets Safe

The master plan references API keys but doesn't store them. Remember:
- Store secrets in `.env.local` (gitignored)
- Use Vercel environment variables for production
- Never commit credentials to git

---

## 📞 Getting Unstuck

### If you're not sure what to build next:
```
"What should I work on next according to PROJECT_MASTER_PLAN.md?"
```

### If you want to understand a section:
```
"Explain section 3B of the master plan - the AI self-learning system"
```

### If you want to see examples:
```
"Show me example code for the opportunity scoring algorithm from section 3B"
```

---

## 🚀 Ready to Start?

Try this as your first message:
```
"Let's start building Travel Bids! Refer to PROJECT_MASTER_PLAN.md.
I'm ready to begin Phase 1 - can you show me the checklist and
help me initialize the Next.js project?"
```

---

**Remember:** The master plan is your friend. Claude will follow it religiously if you remind Claude to reference it! 🎯
