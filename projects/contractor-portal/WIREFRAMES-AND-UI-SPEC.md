# UI/UX Wireframes & Spec — Atlantic Contractor Portal MVP
**Phase:** Design (ready for Figma mockup)  
**Status:** Specification complete, ready for development  
**Target:** Clean, simple, mobile-friendly, bilingual-ready

---

## Design Principles

1. **Simplicity over features** — No clutter, one action per page
2. **Mobile-first** — Responsive on all screens (contractors use phones)
3. **Accessibility** — Large buttons, clear contrast, readable fonts
4. **Bilingual** — All UI in English + French (toggle or auto-detect)
5. **Trust-building** — Audit trail visible (proof of approval)
6. **Fast loading** — <2s page load time

---

## Color Palette

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Primary (brand)** | Deep blue | #003D82 | Buttons, headers, navigation |
| **Success (approval)** | Vibrant red | #FF6B6B | "Approve" buttons, success states |
| **Neutral (backgrounds)** | Light gray | #F8F9FA | Backgrounds, cards |
| **Text (primary)** | Dark | #1A1A1A | Body text, headings |
| **Text (secondary)** | Medium gray | #666666 | Helper text, timestamps |
| **Border (divider)** | Light gray | #E0E0E0 | Card borders, dividers |

---

## Typography

- **Headings (H1-H3):** Inter Bold, 24px / 20px / 16px
- **Body text:** Inter Regular, 14px / 16px
- **Small text:** Inter Regular, 12px (timestamps, helpers)
- **Code/logs:** Courier New, 12px (audit trail)

---

## Component Library

### Buttons

**Primary (Approval action):**
- Background: #FF6B6B (vibrant red)
- Text: White, bold
- Padding: 12px 24px
- Border radius: 4px
- Hover: Darker red (#E64545)
- State: Disabled (gray) if already approved

**Secondary (Skip/Cancel):**
- Background: White
- Text: #003D82 (blue)
- Border: 1px solid #E0E0E0
- Padding: 12px 24px
- Hover: Light blue background

**Loading state:**
- Button text: "Approving..." 
- Spinner animation (2s)
- Button disabled

### Cards

**Quote card:**
```
┌─────────────────────────────────────┐
│ Quote #12345                    ✓   │
│ From: Clarke Heating & Cooling      │
│ Amount: $8,200                      │
│ Date: Mar 31, 2026                  │
│                                     │
│ Status: Pending Your Approval       │
│                                     │
│ [Approve] [Request Change]          │
└─────────────────────────────────────┘
```

**Approval history card:**
```
┌─────────────────────────────────────┐
│ ✓ Quote approved                    │
│   By: Michael Clarke                │
│   Date: Mar 31, 2026 at 2:45 PM     │
│   Amount: $8,200                    │
└─────────────────────────────────────┘
```

---

## Screen 1: Landing Page (No Login)

**URL:** contractor-portal.app  
**Audience:** Client (arriving from email link)  
**Goal:** Build trust, show approval options

```
═══════════════════════════════════════════
         CONTRACTOR PORTAL
═══════════════════════════════════════════

Welcome to [Contractor Name]'s Approval Portal

This is a secure space to review and approve
quotes, scope changes, and project updates.

───────────────────────────────────────────
             QUICK ACTIONS
───────────────────────────────────────────

[📄 Review Quote]
 Approve or request changes

[✏️ Scope Changes]
 Review project modifications

[📸 Progress Updates]
 See project photos & status

[💳 Payment Status]
 View invoice & payment info

───────────────────────────────────────────
Questions? Contact: michael@clarkeheating.ca
═══════════════════════════════════════════
```

**Desktop:** 3-column layout with cards  
**Mobile:** Single column, full width

---

## Screen 2: Quote Approval Page

**URL:** contractor-portal.app/quote/[token]  
**Audience:** Client (from email link)  
**Goal:** Present quote clearly, make approval decision easy

```
═══════════════════════════════════════════
Clarke Heating & Cooling
═══════════════════════════════════════════

QUOTE FOR APPROVAL
───────────────────────────────────────────

Project: Winter HVAC Service (Annual)
Quote #: 12345
Date: March 31, 2026
Expires: April 14, 2026 (2 weeks)

───────────────────────────────────────────
SCOPE OF WORK
───────────────────────────────────────────

□ Annual HVAC inspection & maintenance
□ Furnace filter replacement
□ Refrigerant top-up if needed
□ Blower motor check
□ Safety inspection report

───────────────────────────────────────────
PRICING
───────────────────────────────────────────

Service               Amount
─────────────────────────────
Inspection             $400
Materials              $200
Labor (4 hours)       $560
─────────────────────────────
SUBTOTAL             $1,160
HST (15%)             $174
═════════════════════════════
TOTAL                $1,334
═════════════════════════════

───────────────────────────────────────────
NOTES FROM CONTRACTOR
───────────────────────────────────────────

"This service will ensure your system
runs efficiently through the winter.
Includes a full diagnostic report."

───────────────────────────────────────────
WHAT HAPPENS NEXT?
───────────────────────────────────────────

□ You approve → We schedule service
□ You request change → We'll call to discuss
□ You reject → No action; we'll follow up

───────────────────────────────────────────
YOUR DECISION
───────────────────────────────────────────

[✓ APPROVE THIS QUOTE]
 ("Yes, proceed with this work")

[✏️ REQUEST CHANGE]
 ("Can you adjust price / scope?")

[❌ REJECT]
 ("Not interested right now")

───────────────────────────────────────────
Need clarification?
Email: michael@clarkeheating.ca
Call: (902) 477-1234
═══════════════════════════════════════════
```

**Features:**
- Large, clear pricing
- Scope listed (checkboxes for clarity)
- Notes from contractor (builds trust)
- Clear CTA buttons (one-click approval)
- Contact info for questions
- No login required (token-based access)

---

## Screen 3: Approval Confirmation

**URL:** contractor-portal.app/quote/[token]/confirmed  
**Audience:** Client (after approval)  
**Goal:** Confirm decision, provide record

```
═══════════════════════════════════════════
         ✓ APPROVED
═══════════════════════════════════════════

Your approval has been recorded.

Quote #12345
Amount: $1,334
Approved: March 31, 2026 at 2:45 PM

───────────────────────────────────────────
WHAT'S NEXT?
───────────────────────────────────────────

Clarke Heating & Cooling will contact you
within 24 hours to schedule service.

Expected service date: April 7-11, 2026

───────────────────────────────────────────
YOUR RECORD
───────────────────────────────────────────

A confirmation email has been sent to:
your@email.com

Keep this page or email for your records.
This approval is final and documented.

───────────────────────────────────────────

[← Back to Portal]  [Print Record]

═══════════════════════════════════════════
```

**Mobile-friendly:** Large text, simple layout, easy to print/screenshot

---

## Screen 4: Contractor Dashboard (Login)

**URL:** contractor-portal.app/dashboard  
**Audience:** Contractor (signed in)  
**Goal:** Central hub for all projects

```
═══════════════════════════════════════════
Clarke Heating & Cooling
Dashboard
═══════════════════════════════════════════

Hello Michael [Profile ▼]

───────────────────────────────────────────
TODAY'S STATS
───────────────────────────────────────────

Quotes Pending: 3
Approvals Received: 2
New Messages: 1

───────────────────────────────────────────
ACTIVE PROJECTS
───────────────────────────────────────────

Project              Client      Status
────────────────────────────────────────
Winter HVAC Check    Smith       ✓ Approved
Spring Furnace       Jones       ⏳ Pending
New Install          Brown       ✓ Approved
Summer Service       Wilson      ⏳ Pending

───────────────────────────────────────────
RECENT ACTIVITY
───────────────────────────────────────────

✓ Smith approved quote #12345 ($1,334)
  → Mar 31, 2026 at 2:45 PM

⏳ Jones: Quote #12344 pending (sent Mar 29)
  → 2 days, no response yet

✓ Brown approved scope change +$500
  → Mar 30, 2026

───────────────────────────────────────────
QUICK ACTIONS
───────────────────────────────────────────

[+ NEW PROJECT]
[+ UPLOAD QUOTE]
[+ SCOPE CHANGE]
[+ PROGRESS UPDATE]

───────────────────────────────────────────
HELP & SETTINGS
───────────────────────────────────────────

[Documentation] [Team Management] [Settings]

═══════════════════════════════════════════
```

**Features:**
- Quick stats (at a glance)
- Project list (all active jobs)
- Activity feed (recent approvals)
- Quick actions (upload quote, etc.)
- Mobile responsive (single column)

---

## Screen 5: New Quote Upload

**URL:** contractor-portal.app/project/[id]/quote/new  
**Audience:** Contractor  
**Goal:** Simple quote upload workflow

```
═══════════════════════════════════════════
Upload Quote
═══════════════════════════════════════════

Project: Winter HVAC Service

───────────────────────────────────────────
QUOTE DETAILS
───────────────────────────────────────────

Quote Amount:
[________________] $1,334

Quote Number (optional):
[________________] 12345

Description:
[________________________
________________________] Annual service + inspection

Expires (optional):
[________________] April 14, 2026

───────────────────────────────────────────
UPLOAD QUOTE FILE
───────────────────────────────────────────

[Drag PDF here or click to browse]

Accepts: PDF, JPG, PNG (max 10 MB)

───────────────────────────────────────────
SEND TO CLIENT
───────────────────────────────────────────

Client Email:
[________________] michael@clarkeheating.ca

[✓] Send approval link now
[  ] Send later

───────────────────────────────────────────
NOTES FOR CLIENT (optional)
───────────────────────────────────────────

[________________________
________________________
________________________]

"This service will ensure your system
runs efficiently through the winter."

───────────────────────────────────────────

[Cancel] [Preview] [Send Quote]

═══════════════════════════════════════════
```

**Features:**
- Simple form (amount, description, file)
- Client email selector
- Immediate send option
- Preview before sending

---

## Screen 6: Approval History / Audit Trail

**URL:** contractor-portal.app/project/[id]/approvals  
**Audience:** Contractor (for reference)  
**Goal:** Clear record of all approvals

```
═══════════════════════════════════════════
Project: Winter HVAC Service
Approval History
═══════════════════════════════════════════

───────────────────────────────────────────
TIMELINE
───────────────────────────────────────────

✓ APPROVED
  Quote #12345: $1,334
  Approved by: John Smith (client)
  Date/Time: Mar 31, 2026 at 2:45 PM
  [View Quote]

⏳ PENDING
  Quote #12344: $1,500
  Sent to: Jane Jones (client)
  Date sent: Mar 29, 2026
  Days waiting: 2
  [Send reminder] [Withdraw quote]

✓ APPROVED
  Scope Change: +$500 (new condensing unit)
  Approved by: Bob Brown (client)
  Date/Time: Mar 30, 2026 at 10:15 AM
  [View change order]

✓ APPROVED
  Quote #12343: $2,000 (original)
  Approved by: John Smith (client)
  Date/Time: Mar 15, 2026 at 1:30 PM
  [View quote]

───────────────────────────────────────────
EXPORT / DOWNLOAD
───────────────────────────────────────────

[Download as PDF] [Email Summary]

═══════════════════════════════════════════
```

**Features:**
- Chronological timeline
- Clear status (approved/pending)
- Timestamps + client names
- Quick actions (reminders, withdraw)
- Export/download for records

---

## Screen 7: Client Approval Page (Bilingual)

**URL:** contractor-portal.app/quote/[token]?lang=fr  
**Audience:** Client (French language)  
**Goal:** Same as Screen 2, in French

```
═══════════════════════════════════════════
Clarke Chauffage et Climatisation
═══════════════════════════════════════════

DEVIS À APPROUVER
───────────────────────────────────────────

Projet: Service CVAC Annuel (Hivernage)
Devis #: 12345
Date: 31 mars 2026
Expiration: 14 avril 2026 (2 semaines)

───────────────────────────────────────────
TRAVAUX PROPOSÉS
───────────────────────────────────────────

□ Inspection CVAC annuelle et entretien
□ Remplacement du filtre de fournaise
□ Recharge de réfrigérant si nécessaire
□ Vérification du moteur du ventilateur
□ Rapport d'inspection de sécurité

───────────────────────────────────────────
PRIX
───────────────────────────────────────────

Service                     Montant
─────────────────────────────────────
Inspection                    400 $
Pièces                        200 $
Main-d'œuvre (4 heures)       560 $
─────────────────────────────────────
SOUS-TOTAL                  1 160 $
TPS/TVH (15%)                 174 $
═════════════════════════════════════════
TOTAL                       1 334 $
═════════════════════════════════════════

───────────────────────────────────────────
VOTRE DÉCISION
───────────────────────────────────────────

[✓ APPROUVER CE DEVIS]
[✏️ DEMANDER UNE MODIFICATION]
[❌ REJETER]

═══════════════════════════════════════════
```

**Features:**
- Identical layout to English version
- French text (professional translation)
- Language toggle on main page
- Same CTA buttons

---

## Mobile Layout (All Screens)

**Key principles:**
- Single column (no sidebar)
- Full-width buttons
- Larger touch targets (48px minimum)
- Vertical scrolling (minimal horizontal)
- Simple navigation (back button, home, menu)

**Example (Quote Approval on Mobile):**
```
┌─────────────────────┐
│ ← Quote Review      │
├─────────────────────┤
│ Clarke Heating      │
│ & Cooling           │
├─────────────────────┤
│ QUOTE FOR APPROVAL  │
│                     │
│ Project:            │
│ Winter HVAC         │
│ Amount: $1,334      │
│                     │
│ [Full details...]   │
│                     │
├─────────────────────┤
│ [APPROVE QUOTE] ▼   │
│ [REQUEST CHANGE] ▼  │
├─────────────────────┤
│ Need help?          │
│ michael@...         │
└─────────────────────┘
```

---

## Accessibility Checklist

- [ ] Color contrast: 4.5:1 for text (WCAG AA)
- [ ] Button size: 48px minimum touch target
- [ ] Font size: 14px minimum for body text
- [ ] Alt text: All images have descriptions
- [ ] Keyboard navigation: Tab through all buttons
- [ ] Mobile: Tested on iPhone 6+ and Android
- [ ] Screen reader: Tested with VoiceOver / TalkBack
- [ ] Loading states: Clear feedback (spinners, disabled buttons)

---

## Performance Targets

| Metric | Target | Method |
|--------|--------|--------|
| **Page load** | <2s | CDN, image optimization |
| **Time to interactive** | <3s | Code splitting, lazy loading |
| **First contentful paint** | <1s | Critical CSS inlining |
| **Lighthouse score** | >90 | Performance auditing |

---

## Error States & Validation

### Quote Upload Validation
```
❌ Quote amount required
❌ File too large (max 10 MB)
❌ Invalid file type (PDF/JPG/PNG only)
❌ Client email invalid
```

### Approval Error (Rate limit)
```
⚠️ Too many approvals in short time
   Try again in 30 seconds
   (Prevents accidental double-click)
```

---

## Next Steps (Development)

1. **Week 1:** Create Figma mockups based on these specs
2. **Week 2:** Developer builds responsive HTML/CSS
3. **Week 3:** Connect to backend APIs (Supabase)
4. **Week 4:** User testing with design partners

---

**Status:** ✅ Specification complete. Ready for Figma design + development.
