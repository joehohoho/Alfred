# Even Us Up: Receipt Scanning + OCR Implementation Plan
**Card ID:** task_1774114248437_471a0f9e  
**Status:** Implementation in Progress  
**Started:** 2026-03-21 16:15 ADT  
**Objective:** Build mobile-first receipt capture with OCR parsing for auto-expense creation

---

## Executive Summary

Even Us Up already has foundational receipt scanning (UI for camera/gallery capture + Gemini API integration). This task enhances it to be a true mobile differentiator by:

1. **Improving OCR accuracy** — Enhanced prompting for multi-currency, item-level parsing
2. **Building inline correction UI** — Edit OCR fields before saving (no modal hell)
3. **Adding confidence scoring** — Show users when OCR is uncertain
4. **Receipt templates** — Pre-populate split patterns by merchant/category
5. **Smart retry flow** — Re-scan if confidence too low

**Expected mobile conversion lift:** +20% (per card description)  
**Tech complexity:** 3/5 (OCR integration, receipt templates)  
**Timeline:** 4-6 weeks (full feature)

---

## Current State Analysis

### Existing Implementation
**File:** `/tmp/Expense_Sharing/components/ReceiptScanner.tsx`

**What works:**
- ✅ Camera capture (uses `capture="environment"` for rear camera)
- ✅ Gallery upload (PDF + image support)
- ✅ Gemini 2.5-flash integration
- ✅ Basic data extraction (merchant, total, date)
- ✅ Base64 encoding + data URI handling
- ✅ Error handling with graceful fallback

**Limitations:**
- ❌ No OCR confidence scoring
- ❌ Limited item-level parsing (only total amount)
- ❌ No inline edit before save (must add in expense form)
- ❌ No receipt templating system
- ❌ No retry/re-process flow
- ❌ No image quality checks or multi-angle support
- ❌ No currency detection for multi-currency expenses
- ❌ No split suggestion based on receipt structure

**Tech Stack:**
- React 19 + TypeScript
- Vite (fast dev/build)
- Zustand (state management)
- Supabase (backend)
- Google Gemini 2.5-flash (vision/OCR)
- TailwindCSS (styling)

---

## Phase 1: Enhanced OCR (7-10 days)

### 1.1: Improved Gemini Prompting (2-3 days)

**Goal:** Extract more detailed receipt data with confidence scores

**Changes to `geminiService.ts`:**

```typescript
interface ReceiptData {
  merchant: string;
  merchantConfidence: number; // 0-100
  date: string; // ISO 8601
  dateConfidence: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  totalConfidence: number;
  currency: string;
  currencyConfidence: number;
  warnings: string[]; // e.g., "receipt partially obscured", "text blurry"
}
```

**Enhanced Gemini prompt:**
- Ask for item-level extraction (qty, price, description)
- Request confidence scores (0-100 scale)
- Currency auto-detection
- Warning flags for low-quality images
- Structured output with fallbacks

**New function:** `analyzeReceiptDetailed()`
- Requests structured JSON with confidence
- Implements timeout (15 sec max, Gemini slow on old receipts)
- Parses response safely with validation

**Cost estimate:** No cost increase (same API calls, richer response)

---

### 1.2: Confidence UI Component (2-3 days)

**New component:** `OCRConfidenceIndicator.tsx`
- Shows badge: HIGH (>85%), MEDIUM (60-85%), LOW (<60%)
- Color coded: 🟢 / 🟡 / 🔴
- Expandable details: breakdown of confidence per field
- Retry button for LOW confidence scans

**Locations:**
- ReceiptScanner: after scan completes
- AddExpense: above pre-filled form fields
- Supports both image capture flow and existing expense editing

**Implementation:**
- New Zustand store: `receiptStore` (holds scan results + confidence data)
- UI follows existing TailwindCSS patterns
- Mobile-optimized (compact on <600px width)

---

### 1.3: Image Quality Checks (2-3 days)

**Goal:** Reject poor-quality images before sending to Gemini

**New utility:** `validateReceiptImage(file, image)`
- Check resolution (min 1280px width recommended)
- Check brightness/contrast (detect if too dark/washed out)
- Check orientation (warn if sideways)
- Estimate OCR success likelihood

**Integration:**
- Run client-side after file selection (before showing spinner)
- Show warning if quality low: "Receipt quality low. Consider retaking."
- Allow override (user can proceed anyway)
- Skip for PDFs (assume already high-quality scans)

**No new API calls** — uses ImageData / canvas API only

---

## Phase 2: Inline Editing UI (8-12 days)

### 2.1: OCR Preview Modal (4-5 days)

**New component:** `ReceiptOCRPreview.tsx`
- Shows extracted data in editable form
- Fields are click-to-edit (inline, not modal popup)
- Item list with +/- buttons to add/remove line items
- Real-time total calculation
- "Confidence bar" under uncertain fields
- "Save" vs "Cancel" buttons

**Spec:**
```
┌─────────────────────────────────────┐
│ Receipt Preview & Corrections       │
├─────────────────────────────────────┤
│ Merchant: [Whole Foods Market] ✏️  │ (high conf 92%)
│ Date: [2026-03-21] ✏️              │ (high conf 88%)
│                                     │
│ Items:                              │
│ ┌────────────────────────────────┐ │
│ │ 🥬 Spinach (qty: 1) $4.99  ✏️ │ │ (med conf 71%)
│ │ 🍎 Apples (qty: 3) $9.97  ✏️ │ │ (high conf 89%)
│ │ + Add item                      │ │
│ └────────────────────────────────┘ │
│                                     │
│ Subtotal: $14.96                    │
│ Tax: $1.50 ✏️                      │ (med conf 65%)
│ Tip: [—] ✏️                         │
│ ─────────────────────────────────   │
│ Total: $16.46                       │
│ Currency: CAD (auto-detected) ✏️   │ (high conf 95%)
│                                     │
│ ⚠️ Receipt partially obscured       │
│                                     │
│ [ Save Corrections ] [ Discard ]    │
└─────────────────────────────────────┘
```

**Features:**
- Click any field to edit inline (no modal)
- Auto-recalculate totals when items/tax change
- Item deletion with confirm
- Currency selector (defaults to household currency)
- Confidence badges under uncertain fields
- Warnings displayed prominently

---

### 2.2: Integration with AddExpense (4-5 days)

**Flow:**
1. User captures receipt → ReceiptScanner
2. Gemini processes → ReceiptOCRPreview modal
3. User corrects (if needed) → clicks Save
4. Pre-fills AddExpense form:
   - `merchant` → `title` (auto-capitalize)
   - `date` → `date` field
   - `total` → `amount`
   - `items[*].description` → suggestion for split categories
   - `currency` → auto-set to extracted currency
5. User can still edit everything in AddExpense form

**New props for AddExpense:**
```typescript
interface AddExpenseProps {
  initialReceipt?: ReceiptData; // Pre-filled from OCR
  receiptUrl?: string; // Attachment storage
}
```

**State flow:**
- ReceiptScanner → ReceiptOCRPreview → AddExpense
- Use React Router state to pass data between steps

---

### 2.3: Retry/Reprocess UI (2-3 days)

**When confidence <60%:**
- Show prominent retry button: "Re-scan receipt"
- Option to:
  - **Retake photo** (open camera again)
  - **Upload different angle** (try from gallery)
  - **Proceed anyway** (skip OCR, manual entry)
- Track retry attempts (max 3, then suggest manual entry)

**Implementation:**
- New component: `ReceiptRetryFlow.tsx`
- Integrated into ReceiptScanner workflow
- Don't reset state on retry (show last scan for reference)

---

## Phase 3: Receipt Templating (6-10 days)

### 3.1: Template Storage Schema (2 days)

**New Supabase table:** `receipt_templates`
```sql
CREATE TABLE receipt_templates (
  id UUID PRIMARY KEY,
  household_id UUID REFERENCES households(id),
  merchant_name TEXT, -- e.g., "Costco", "Walmart", "Restaurant"
  category TEXT, -- e.g., "Groceries", "Gas", "Dining"
  typical_split_pattern JSONB, -- suggest who pays what
  default_split_members TEXT[], -- e.g., ["alice", "bob"]
  item_categories TEXT[], -- common items, e.g., ["Groceries", "Household"]
  created_at TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0
);
```

**Example template (groceries):**
```json
{
  "merchant_name": "Whole Foods",
  "category": "Groceries",
  "typical_split_pattern": {
    "alice": { "percentage": 50, "categories": ["groceries", "household"] },
    "bob": { "percentage": 50, "categories": ["groceries"] }
  },
  "default_split_members": ["alice", "bob"]
}
```

### 3.2: Auto-Generate Templates (2-3 days)

**Logic:** After user saves an expense, learn from splits
- Extract merchant name from receipt
- Check if similar merchant has been used before
- If 3+ similar expenses exist, auto-create template
- Show suggestion: "Save as template for future [Merchant] expenses?"

**Implementation:**
- New Zustand store: `templateStore`
- Hook: `useSuggestTemplate()` — checks if should suggest
- API endpoint: `POST /api/templates` (save template)

### 3.3: Apply Templates (2-3 days)

**Flow:** User uploads receipt → OCR preview
1. Extract merchant name
2. Check if template exists for that merchant
3. If yes, show suggestion bar: "We've split [Merchant] before. Apply split?"
4. User clicks → pre-populate splits in AddExpense

**Integration:**
- New util: `findApplicableTemplate(merchantName, householdId)`
- UI suggestion: non-intrusive banner under confidence badges

---

## Phase 4: Advanced Features (Optional, 4-6 weeks later)

- **Multi-page receipt support** — handle long receipts (multiple photos)
- **Handwriting OCR** — for hand-written receipts
- **Duplicate detection** — warn if receipt already exists
- **Batch upload** — scan multiple receipts at once
- **Receipt storage** — full image archive with metadata
- **Analytics** — spending patterns by merchant/category

---

## Implementation Order (Priority)

### Week 1: Foundation (Phase 1 + 2.1)
1. Enhance Gemini prompting + response parsing (2-3 days)
2. Add confidence scoring UI (2-3 days)
3. Image quality validation (2-3 days)
4. Build ReceiptOCRPreview component (4-5 days)

**Deliverable:** Receipt scanner with editable preview before save

### Week 2: Integration (Phase 2.2 + 2.3)
5. Integrate with AddExpense form (4-5 days)
6. Build retry/reprocess UI (2-3 days)

**Deliverable:** Full end-to-end flow (capture → correct → add expense)

### Week 3: Templating (Phase 3)
7. Receipt template schema + API (2 days)
8. Auto-generate + apply templates (4-6 days)

**Deliverable:** Smart split suggestions from merchant history

### Week 4: Polish + Testing
9. Mobile responsiveness audit
10. Performance optimization (Gemini timeout, batch requests)
11. Error handling edge cases
12. User testing feedback loop

**Deliverable:** Production-ready feature, deploy to staging

---

## API & Data Flow

### New/Updated API Endpoints

**POST /api/receipts/analyze**
```json
Request: {
  "image_base64": "data:image/jpeg;base64,..."
}

Response: {
  "receipt_data": { /* ReceiptData object */ },
  "confidence_scores": { /* per-field scores */ },
  "warnings": ["receipt_partially_obscured"]
}
```

**POST /api/templates**
```json
Request: {
  "merchant_name": "Whole Foods",
  "category": "Groceries",
  "split_pattern": { /* as above */ }
}

Response: { "template_id": "...", "created_at": "..." }
```

**GET /api/templates/:merchant_name**
```json
Response: {
  "templates": [ /* matching templates */ ],
  "suggested_split": { /* recommended split */ }
}
```

### Frontend State Updates

**New Zustand stores:**
- `receiptStore` — current scan state, confidence data
- `templateStore` — merchant templates, suggestions

**Updated stores:**
- `expenseStore` — accept ReceiptData as initialization param

---

## Testing Strategy

### Unit Tests
- Confidence calculation logic
- Image quality validation
- Currency detection
- Receipt template matching

### Integration Tests
- Gemini API (mock responses)
- End-to-end flow (capture → correct → save)
- Template suggestion logic

### Manual Testing
- iOS Safari (rear camera capture)
- Android Chrome (gallery + camera)
- Various receipt types (grocery, restaurant, invoice)
- Poor quality images (low light, skewed, partially obscured)
- Multi-currency receipts

---

## Success Criteria

### Phase 1 Complete (Enhanced OCR)
- ✅ Confidence scores displayed on all extracted fields
- ✅ Item-level extraction working for 80%+ of receipts
- ✅ Image quality warnings prevent Gemini overload

### Phase 2 Complete (Inline Editing)
- ✅ Users can correct OCR in <30 sec without modal hell
- ✅ Retry flow works smoothly (UX not frustrating)
- ✅ Pre-fill AddExpense reduces manual entry by 70%

### Phase 3 Complete (Templates)
- ✅ Template suggestions appear for recurring merchants
- ✅ Apply template reduces split setup time by 50%
- ✅ Auto-generate templates trigger after 3 similar expenses

### Metrics
- **Time to add expense (receipt → saved):** <2 min (down from ~5 min)
- **OCR accuracy:** 85%+ on first scan (high confidence)
- **User preference:** 70%+ prefer receipt scanning over manual entry
- **Mobile conversion:** +20% (per goal)

---

## Risk Mitigation

### Risk: Gemini API quota/cost overrun
**Mitigation:**
- Implement request caching (same receipt image → cached result)
- Rate limiting (max 10 scans/minute per household)
- Image compression before sending (quality ≥720p but <2MB)
- Monitor API costs weekly

### Risk: OCR accuracy varies wildly by receipt type
**Mitigation:**
- Start with common types (groceries, restaurants, gas)
- Collect user feedback on accuracy per merchant
- Build confidence thresholds based on empirical data
- Provide manual entry fallback always

### Risk: Template system over-complicates UI
**Mitigation:**
- Start with auto-suggest (non-intrusive)
- Hide template management behind settings
- Only surface when genuinely helpful (>3 similar expenses)

### Risk: Mobile responsiveness breaks on small screens
**Mitigation:**
- Test on 375px width (iPhone SE)
- Use mobile-first design (preview modal adapts)
- Stack fields vertically on <600px

---

## File Structure (New)

```
components/
  ├─ ReceiptScanner.tsx (enhance with quality checks)
  ├─ ReceiptOCRPreview.tsx (NEW - inline edit modal)
  ├─ OCRConfidenceIndicator.tsx (NEW - confidence badges)
  └─ ReceiptRetryFlow.tsx (NEW - retry UX)

services/
  ├─ geminiService.ts (enhance prompting)
  ├─ receiptService.ts (NEW - receipt API calls)
  └─ templateService.ts (NEW - template API calls)

stores/
  ├─ receiptStore.ts (NEW - scan state)
  └─ templateStore.ts (NEW - template state)

utils/
  ├─ receiptValidator.ts (NEW - image quality checks)
  └─ receiptTemplateUtils.ts (NEW - template matching logic)
```

---

## Cost Analysis

### Gemini API
- **Current:** ~$2.50/month baseline (small user base)
- **After launch:** Est. $8-15/month (3-5x more scans)
- **Mitigation:** Caching + compression keeps cost linear

### Storage (Supabase)
- **Receipts (images):** ~1MB avg per household/month
- **Templates:** <1MB per household
- **Cost impact:** Negligible (<$2/month additional)

---

## Dependencies & Compatibility

- **React:** 19.2.3 ✅
- **TypeScript:** 5.8.2 ✅
- **Gemini API:** 2.5-flash model ✅
- **Supabase:** v2.87+ ✅
- **Mobile browsers:** iOS 15+, Android 10+ ✅

---

## Rollout Plan

**Phase A: Staging (4-5 weeks development)**
- Deploy to staging environment
- Internal testing with sample data
- Performance benchmarking (Gemini latency, storage)

**Phase B: Beta (2 weeks, invite select users)**
- 5-10 power users test end-to-end
- Collect feedback on UX, accuracy, bugs
- Iterate on template system

**Phase C: Production (gradual rollout)**
- Feature flag: receipt scanning beta opt-in
- Monitor error rates, Gemini API health
- Ramp up to 100% users over 2 weeks

**Phase D: Monitoring (ongoing)**
- Track OCR accuracy metrics per merchant
- A/B test confidence thresholds
- Monitor for cost overruns

---

## Known Limitations

1. **PDF support:** PDFs not analyzed (Gemini requires image input)
   - *Workaround:* User can screenshot first page
2. **Handwritten receipts:** Low confidence (~50%)
   - *Workaround:* Manual entry fallback
3. **Multi-page receipts:** Single image only
   - *Future:* Support concatenated images
4. **Geo-specific currencies:** May misdetect currency in some regions
   - *Mitigation:* Allow manual correction

---

## Next Steps

1. ✅ Research completed (this doc)
2. ⏭️ Implement Phase 1 (enhanced OCR + confidence UI)
3. ⏭️ Build Phase 2 (inline editing + AddExpense integration)
4. ⏭️ Add Phase 3 (templating system)
5. ⏭️ Testing + QA
6. ⏭️ Staging deployment
7. ⏭️ Beta user feedback
8. ⏭️ Production rollout

**Start:** Enhanced Gemini prompting (geminiService.ts)

---

**Updated:** 2026-03-21 16:20 ADT
