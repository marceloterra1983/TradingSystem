# Internal Communications Plan - docs Launch

**Launch Date**: 2025-11-15 (target)
**Owner**: DocsOps + ProductOps
**Audience**: All TradingSystem developers, operators, product managers, stakeholders

## Communication Objectives

1. **Awareness**: Ensure all team members know about docs launch
2. **Adoption**: Drive migration from legacy docs to docs
3. **Training**: Educate users on new navigation and features
4. **Feedback**: Collect user feedback for continuous improvement
5. **Support**: Provide clear channels for questions and issues

## Communication Timeline

### T-14 Days (Nov 1): Pre-Launch Announcement

**Channel**: Slack #general, #dev, #docs-migration

**Message Template**:
```
📚 **docs Launch Announcement** 📚

We're excited to announce that the new TradingSystem documentation (docs) will launch on **November 15, 2025**!

**What's New:**
✅ Comprehensive app documentation (Workspace, TP Capital, Order Manager, Data Capture)
✅ Complete API specifications with Redoc integration
✅ Frontend design system and engineering guidelines
✅ Database schemas, migrations, and operational runbooks
✅ 46 tool guides (Node.js, .NET, Python, Docker, etc.)
✅ Product requirements (PRD) and software design docs (SDD)
✅ Auto-generated content (ports table, design tokens)
✅ 26 PlantUML diagrams for architecture visualization

**How to Access:**
- Local dev (docs): http://localhost:3400
- Unified domain: http://tradingsystem.local/docs
- Legacy docs (Docusaurus v2): http://localhost:3004
- Browse content: `docs/content/`

**What to Expect:**
- 135+ documentation pages (vs 251 in legacy docs)
- Improved navigation and search
- Auto-generated reference content
- Consistent formatting and structure
- Quarterly maintenance and updates

**Action Items:**
- 📖 Preview docs at http://localhost:3400
- 💬 Share feedback in #docs-feedback channel
- 🐛 Report issues in GitHub (label: documentation)
- 📅 Attend launch demo (Nov 14, 2 PM)

**Questions?** Ask in #docs-migration or contact @DocsOps
```

**Additional Channels**:
- Email to all-team@company.com
- Post in project management tool (Jira, Linear)
- Add to weekly team meeting agenda

---

### T-7 Days (Nov 8): Launch Demo Invitation

**Channel**: Slack #general, Calendar invite

**Message Template**:
```
📅 **docs Launch Demo - November 14, 2 PM**

Join us for a 30-minute walkthrough of the new documentation system!

**Agenda:**
1. Overview of docs structure (5 min)
2. Navigation and search demo (5 min)
3. Key features showcase (10 min)
   - Auto-generated content (ports, tokens)
   - PlantUML diagrams
   - API specifications with Redoc
   - Multi-language support (PT/EN)
4. Q&A (10 min)

**When:** November 14, 2025, 2:00 PM - 2:30 PM
**Where:** Zoom link / Meeting room
**Recording:** Will be shared in #docs-migration

**RSVP:** React with ✅ or decline calendar invite

**Can't Attend?** Watch the recording or schedule 1:1 walkthrough with @DocsOps
```

**Calendar Invite**:
- Title: docs Launch Demo
- Date: November 14, 2025, 2:00 PM
- Duration: 30 minutes
- Attendees: all-team@company.com
- Agenda: (same as above)
- Zoom link: [link]

---

### T-1 Day (Nov 14): Launch Reminder

**Channel**: Slack #general, #dev

**Message Template**:
```
🚀 **docs Launches Tomorrow!** 🚀

**Launch Date:** November 15, 2025
**Access:** http://tradingsystem.local/docs (unified domain) or http://localhost:3400 (local dev)

**What Changes:**
✅ New documentation URL: tradingsystem.local/docs (was: localhost:3004)
✅ Updated navigation and search
✅ Auto-generated reference content
✅ Comprehensive app and API documentation

**What Stays the Same:**
- Legacy docs remain accessible at localhost:3004 (legacy portal) during transition
- All content migrated (no information loss)
- Same authentication and access controls

**Action Items for Tomorrow:**
1. Update bookmarks to new URL
2. Explore new navigation structure
3. Try the search feature
4. Share feedback in #docs-feedback

**Need Help?** See FAQ: http://localhost:3400/faq or ask in #docs-migration

**Demo Recording:** Available in #docs-migration channel
```

---

### Launch Day (Nov 15): Go-Live Announcement

**Channel**: Slack #general, #dev, #docs-migration, Email

**Message Template**:
```
🎉 **docs is LIVE!** 🎉

**New Documentation Hub:** http://tradingsystem.local/docs

**What's Available:**
📱 **Apps**: Workspace, TP Capital, Order Manager, Data Capture (20 pages)
🔌 **APIs**: Order Manager, Data Capture, Workspace (3 pages + Redoc)
🎨 **Frontend**: Design system, guidelines, engineering (14 pages)
🗄️ **Database**: Schemas, migrations, backup/retention (4 pages)
🛠️ **Tools**: Node.js, .NET, Python, Docker, and more (46 pages)
📐 **SDD**: Domain schemas, events, flows, API specs (12 pages)
📋 **PRD**: Product requirements and features (6 pages, PT/EN)
🤖 **Prompts & Agents**: LLM patterns and agent docs (10 pages)
📚 **Reference**: Templates, ADRs, diagrams (13 pages + 26 diagrams)
❓ **FAQ & Changelog**: Common questions and release history (2 pages)

**Key Features:**
✨ Auto-generated content (ports table, design tokens)
✨ 26 PlantUML diagrams with automatic rendering
✨ Comprehensive search across all content
✨ Consistent navigation and structure
✨ Multi-language support (PT/EN for PRDs)
✨ Quarterly maintenance and updates

**Quick Start:**
1. Visit http://tradingsystem.local/docs
2. Browse by category or use search
3. Bookmark frequently used pages
4. Share feedback in #docs-feedback

**Legacy Docs:**
- Still accessible at http://localhost:3004 (legacy portal)
- Will be archived after 30-day transition period
- Redirects will be added in Phase 6

**Support:**
- 💬 Questions: #docs-migration channel
- 🐛 Issues: GitHub (label: documentation)
- 📧 Email: docs-ops@company.com
- 📖 FAQ: http://localhost:3400/faq

**Thank You:**
Thanks to DocsOps, ProductOps, ArchitectureGuild, FrontendGuild, BackendGuild, and all contributors for making this launch possible! 🙌

**Feedback Welcome:**
We're continuously improving! Share your thoughts in #docs-feedback.
```

**Email Version**: Same content with formatted HTML, include screenshots of new documentation

---

### T+7 Days (Nov 22): Post-Launch Survey

**Channel**: Slack #general, Email

**Message Template**:
```
📊 **docs Feedback Survey** 📊

It's been one week since docs launched! We'd love your feedback.

**Survey Link:** [Google Form / Typeform link]

**Questions (5 minutes):**
1. How often do you use the documentation? (Daily, Weekly, Monthly, Rarely)
2. How easy is it to find what you need? (1-5 scale)
3. What's your favorite feature? (Open text)
4. What needs improvement? (Open text)
5. Any missing content? (Open text)

**Incentive:** First 20 responses get a coffee voucher! ☕

**Deadline:** November 29, 2025

**Results:** Will be shared in #docs-migration and used to prioritize improvements.

Thank you for helping us improve! 🙏
```

---

### T+30 Days (Dec 15): Transition Complete

**Channel**: Slack #general, Email

**Message Template**:
```
✅ **docs Transition Complete** ✅

**Legacy docs archived:** The old documentation system (docs/) has been archived.

**What Changed:**
- Legacy docs moved to `docs/archive/` (read-only)
- All links redirect to docs
- Bookmarks automatically redirect
- Search now covers docs only

**What to Do:**
- Update any hardcoded links to docs paths
- Report broken redirects in #docs-migration
- Continue sharing feedback in #docs-feedback

**Metrics (First 30 Days):**
- 📊 Page views: [count]
- 🔍 Search queries: [count]
- 💬 Feedback responses: [count]
- 🐛 Issues reported: [count]
- ✅ Issues resolved: [count]

**Thank You:**
Thanks for your patience during the transition! The new documentation is here to stay and will continue improving based on your feedback.

**Questions?** Contact @DocsOps or ask in #docs-migration
```

---

## Dashboard Updates

**If TradingSystem has internal dashboard/portal:**

### Banner Notification (T-7 to Launch)

**Location**: Top of dashboard
**Type**: Info banner (blue)
**Message**: "📚 New documentation launching Nov 15! Preview at http://localhost:3400"
**Action**: "Preview Now" button → http://localhost:3400
**Dismissible**: Yes

### Launch Day Banner (Launch to T+7)

**Location**: Top of dashboard
**Type**: Success banner (green)
**Message**: "🎉 docs is live! Explore the new documentation hub."
**Action**: "Explore" button → http://tradingsystem.local/docs
**Dismissible**: Yes

### Permanent Link (T+7 onwards)

**Location**: Dashboard navigation menu
**Label**: "📚 Documentation"
**URL**: http://tradingsystem.local/docs
**Icon**: Book icon
**Position**: Top navigation or sidebar

---

## Stakeholder Communications

### Executive Summary (for leadership)

**Audience**: CTO, Engineering Director, Product Director
**Format**: Email or slide deck
**Timing**: T-7 days

**Content**:
- **Overview**: New documentation system with 135+ pages
- **Benefits**: Improved navigation, auto-generated content, comprehensive coverage
- **Investment**: 3 months migration effort, 5 phases
- **Metrics**: 251 legacy files → 135 structured pages, 98.4% frontmatter compliance
- **Launch Plan**: 3-week review, Nov 15 launch, 30-day transition
- **Success Criteria**: 100% validation pass, stakeholder approval, user satisfaction >4/5
- **Next Steps**: Phase 6 (update references, archive legacy docs)

### Guild Communications

**Audience**: ArchitectureGuild, FrontendGuild, BackendGuild, ProductOps, DocsOps
**Format**: Slack message in guild channels
**Timing**: T-14 days

**Message Template**:
```
📚 **[Guild Name] - docs Review Request**

The new documentation system launches Nov 15. We need your help reviewing [X] files in your domain.

**Your Files:**
- [List of files assigned to this guild]

**Review Criteria:**
- Content quality and technical accuracy
- Examples tested and working
- Cross-references valid
- No placeholder text

**Timeline:**
- Self-review: Week 1 (Oct 24-31)
- Peer review: Week 2 (Oct 31 - Nov 7)
- Sign-off: Week 3 (Nov 7-14)

**How to Review:**
1. See `docs/governance/REVIEW-CHECKLIST.md` for detailed checklist
2. Review assigned files in `docs/content/`
3. Test procedures and commands
4. Provide feedback via PR or review document
5. Sign off when complete

**Questions?** Ask in #docs-migration or contact @DocsOps

**Thank you for your help!** 🙏
```

---

## Feedback Channels

### Slack Channels

**#docs-migration** (existing):
- Purpose: Migration coordination and launch planning
- Audience: DocsOps, migration contributors
- Lifecycle: Archive after Phase 6 complete

**#docs-feedback** (new):
- Purpose: User feedback and improvement suggestions
- Audience: All team members
- Lifecycle: Permanent
- Monitoring: DocsOps reviews daily

**#docs-ops** (new, optional):
- Purpose: Documentation operations and maintenance
- Audience: DocsOps, guild leads
- Lifecycle: Permanent
- Topics: Quarterly reviews, automation issues, governance

### GitHub Issues

**Labels**:
- `documentation` - General documentation issues
- `docs-v2` - Specific to new documentation system
- `docs-migration` - Migration-related issues
- `docs-automation` - Automation script issues
- `docs-content` - Content accuracy or completeness

**Issue Templates**:
- Documentation Bug (broken link, incorrect info)
- Documentation Enhancement (new content, improvements)
- Documentation Question (clarification needed)

### Email

**docs-ops@company.com** (if exists):
- Purpose: Direct contact for documentation team
- Response SLA: 48 hours for questions, 24 hours for critical issues

---

## Success Metrics

**Track for 30 Days Post-Launch**:

### Adoption Metrics
- Page views (docs vs legacy docs)
- Unique visitors
- Search queries
- Avg. session duration
- Bounce rate

### Engagement Metrics
- Feedback responses (survey)
- Slack messages in #docs-feedback
- GitHub issues created (label: documentation)
- Demo attendance

### Quality Metrics
- Issues reported (bugs, broken links)
- Issues resolved (within SLA)
- User satisfaction score (survey)
- Net Promoter Score (would you recommend?)

**Target Metrics**:
- Page views: >1000 in first 30 days
- User satisfaction: >4/5
- Issue resolution rate: >90% within SLA
- Adoption rate: >80% of team using docs

---

## Rollback Plan

**If Launch Fails** (critical issues, stakeholder rejection):

### Immediate Actions (Day 1)

1. **Revert to Legacy Docs**:
   - Keep legacy docs at http://localhost:3004
   - Remove docs links from dashboard/navigation
   - Post announcement: "docs launch postponed, legacy docs remain active"

2. **Communicate Rollback**:
   ```
   ⚠️ **docs Launch Postponed**
   
   We've identified critical issues with the new documentation system and are postponing the launch.
   
   **What This Means:**
   - Legacy docs remain active at http://localhost:3004
   - docs preview still available at http://localhost:3400
   - No action required from you
   
   **Next Steps:**
   - Resolve critical issues (see #docs-migration)
   - Schedule new launch date
   - Communicate updated timeline
   
   **Apologies for the inconvenience.** We're committed to delivering high-quality documentation.
   ```

3. **Root Cause Analysis**:
   - Identify critical issues (broken links, missing content, validation failures)
   - Prioritize fixes (P0 must fix before relaunch)
   - Assign owners and deadlines
   - Schedule post-mortem meeting

### Recovery Timeline

- **Day 1-3**: Fix critical issues
- **Day 4-7**: Re-validate (docs:check, validate-frontmatter.py, docs:links)
- **Day 8-10**: Stakeholder re-approval
- **Day 11**: New launch date announcement
- **Day 14**: Relaunch attempt

---

## Communication Templates

### Slack Announcement Template

```markdown
**[Emoji] [Title] [Emoji]**

[Brief description of announcement]

**[Section 1 Title]:**
- [Bullet point 1]
- [Bullet point 2]

**[Section 2 Title]:**
- [Bullet point 1]

**Action Items:**
- [Action 1]
- [Action 2]

**Questions?** [Contact info]
```

### Email Template

```html
<h2>[Title]</h2>
<p>[Introduction paragraph]</p>

<h3>[Section 1]</h3>
<ul>
  <li>[Point 1]</li>
  <li>[Point 2]</li>
</ul>

<h3>[Section 2]</h3>
<ul>
  <li>[Point 1]</li>
</ul>

<h3>Action Items</h3>
<ul>
  <li>[Action 1]</li>
  <li>[Action 2]</li>
</ul>

<p><strong>Questions?</strong> [Contact info]</p>

<p>Best regards,<br>DocsOps Team</p>
```

---

## Related Documentation

- [Review Checklist](./REVIEW-CHECKLIST.md) - Chapter-by-chapter review
- [Maintenance Checklist](./MAINTENANCE-CHECKLIST.md) - Quarterly hygiene
- [Validation Guide](./VALIDATION-GUIDE.md) - How to run validation suite
- [Migration Report](../migration/INVENTORY-REPORT.md) - Executive summary
