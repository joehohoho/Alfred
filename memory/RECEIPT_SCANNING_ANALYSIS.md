# Receipt Scanning + OCR Implementation Plan
**Card:** task_1774114248437_471a0f9e  
**Status:** IN PROGRESS  
**Date:** 2026-03-21

## Current State Analysis

### ✅ What Already Exists
1. **Gemini OCR Integration** (`services/geminiService.ts`)
   - Gemini 2.5 Flash model for receipt analysis
   - JSON schema-based structured extraction
   - Fallback regex-based text parser for failures
   - Extracts: merchant, date, subtotal, tax, tip, total, line items, store address, phone, payment method, order number

2. **Receipt Scanner Component** (`components/ReceiptScanner.tsx`)
   - Live camera capture with edge detection
   - Batch mode for multiple receipts
   - Offline queue + sync when online
   - Gallery/file upload support
   - PDF support
   - Real-time frame quality analysis
   - Image processing utilities (cropping, optimization)

3. **Receipt Item Splitter** (`components/ReceiptItemSplitter.tsx`)
   - Manual adjustment of OCR line items
   - Split amount calculations
   - UI for confirming/adjusting items

4. **Data Models** (`types.ts`)
   - `ReceiptData` / `ParsedReceipt` interfaces
   - `LineItem` interface with confidence scores
   - Support for multi-receipt attachments

5. **Integration Points**
   - AddExpense component uses ReceiptScanner
   - Receipt data flows → ReceiptItemSplitter → final expense
   - Analytics tracking for receipt events

### ⚠️ Current Gaps (Mobile Differentiator Opportunity)

1. **Mobile Camera UX**
   - No orientation detection (portrait vs landscape)
   - No exposure/focus controls
   - Auto-capture trigger potentially not reliable on weak devices
   - No guide overlay for receipt positioning

2. **Receipt Template System**
   - Basic merchant detection exists
   - No learning from previous receipts
   - No merchant-specific parsing rules

3. **Split Readiness**
   - Can extract line items from receipt
   - UI exists to adjust them
   - **But:** No direct "assign item to person" flow from parsed items
   - Missing: quick assign-all, equal split, percentage buttons

4. **Offline + Batch**
   - Queue exists but could be more visible
   - No batch processing progress bar
   - No receipt history dashboard

5. **Mobile-First Polish**
   - No haptic feedback on good captures
   - No gesture-based adjustments
   - No voice input for manual amounts
   - Minimal mobile optimization for small screens

6. **Confidence & Accuracy**
   - Confidence scores calculated but not surfaced
   - No "low confidence" warnings in UI
   - No user ability to flag bad extractions for training

## Implementation Strategy (4-6 weeks)

### Phase 1: Mobile UX Enhancements (Week 1-2)
**Goal:** Make receipt capture feel native + intuitive on mobile

- [ ] **Receipt capture guide overlay**
  - Visual guides (corners, grid) for proper positioning
  - Real-time feedback: "Move closer", "Better angle needed"
  - Guide disappears when confidence > 70%

- [ ] **Camera controls**
  - Tap to focus
  - Swipe for brightness adjustment
  - Pinch to zoom
  - Reset button

- [ ] **Capture feedback**
  - Haptic feedback on good capture (when confidence > 75%)
  - Shake/flash on poor capture to retry
  - Audio cue (beep) when ready to snap

- [ ] **Mobile responsive UI**
  - Full-screen camera on mobile
  - Portrait-only lock during capture
  - Thumb-friendly buttons (bottom placement)

### Phase 2: Split Flow Optimization (Week 2-3)
**Goal:** Make "photo → split ready" a 30-second flow

- [ ] **Direct item assignment**
  - Show line items with checkboxes
  - Quick assign buttons per member ("Assign to [name]")
  - Drag-to-assign on touch devices

- [ ] **Smart split templates**
  - Button: "Split evenly"
  - Button: "Split by percentage"
  - Button: "Split by amount"
  - Remembers last used split type per user

- [ ] **Receipt item validation**
  - Show confidence % per item
  - Allow tap-to-edit any item
  - "Low confidence" warning badge

- [ ] **Review screen**
  - Clear summary: merchant, date, items, amounts
  - Edit buttons for quick corrections
  - "Create expense" is last step (not first)

### Phase 3: Receipt History + Intelligence (Week 3-4)
**Goal:** Speed up repeat expense flows

- [ ] **Receipt history dashboard**
  - Recently scanned receipts (merchant, date, amount)
  - "Quick add" button to repeat an expense
  - "Refine & split" to adjust and use as template

- [ ] **Merchant template learning**
  - Store default split for each merchant
  - Remember last payer + split type per merchant
  - "Upcoming bills" from recurring merchants

- [ ] **Confidence feedback loop**
  - User can mark "this extraction was wrong"
  - Track accuracy per merchant
  - Show merchants with low accuracy

### Phase 4: Offline & Batch Optimizations (Week 4-5)
**Goal:** Batch capture + async processing for trips

- [ ] **Improved batch mode**
  - Progress bar during batch processing
  - Visual queue (thumbnails of pending receipts)
  - Ability to remove items from batch before processing
  - Parallel processing (2-3 concurrent Gemini calls)

- [ ] **Offline resilience**
  - Visual indicator of queued receipts
  - Local retry logic with exponential backoff
  - Larger queue storage (currently limited by localStorage)

- [ ] **Sync notifications**
  - Toast when offline receipts are being synced
  - Show which receipts are being processed
  - Error recovery UI for failed items

### Phase 5: Polish + Analytics (Week 5-6)
**Goal:** Instrument and optimize the full flow

- [ ] **Analytics instrumentation**
  - Track time-to-split (capture to final expense)
  - Measure OCR accuracy per receipt
  - User feedback on extracted data
  - Drop-off points in flow

- [ ] **Error handling improvements**
  - Better fallback when Gemini fails
  - Suggest manual entry with speed-up hints
  - Guide user to photograph better receipts

- [ ] **A/B testing readiness**
  - Instrumentation for testing guide overlays
  - Test different split UI approaches
  - Measure engagement for each feature

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| **Time-to-split** | <60 sec (photo → expense) | Analytics event timestamps |
| **OCR accuracy** | >85% (items correctly extracted) | User feedback + manual validation |
| **Mobile conversion** | +20% (vs current) | App analytics, funnel tracking |
| **Receipt batch speed** | 3-5 sec per receipt | Process time tracking |
| **User confidence** | >4.0/5 (receipt accuracy rating) | In-app rating after split |
| **Retry rate** | <10% (users re-scan same receipt) | Duplicate detection + analytics |

## Deliverables

### Code
1. **Components:**
   - `ReceiptCaptureGuide.tsx` — overlay + positioning guidance
   - `ReceiptSplitFlow.tsx` — optimized item → expense flow
   - `ReceiptHistory.tsx` — enhanced dashboard + quick-add
   - `MerchantTemplates.tsx` — default split per merchant

2. **Services:**
   - `receiptTemplateEngine.ts` — merchant-specific parsing rules
   - `ocrAccuracyTracker.ts` — confidence + feedback collection
   - `offlineQueue.ts` (enhanced) — better batch + retry logic

3. **Utilities:**
   - `cameraControls.ts` — focus, zoom, brightness
   - `receiptGuideOverlay.ts` — visual guidance rendering
   - `splitAssignment.ts` — quick assign + validation

4. **Tests:**
   - Unit: `geminiService.fallback.test.ts` (already exists)
   - Integration: `receiptFlow.integration.test.tsx` (split flow end-to-end)
   - E2E: Receipt capture → split → expense creation

### Documentation
1. **RECEIPT-SCANNING-GUIDE.md** — user-facing guide
2. **OCR-ACCURACY-NOTES.md** — insights + known issues
3. **MOBILE-OPTIMIZATION-CHECKLIST.md** — mobile performance tips

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Gemini API quota/cost | Medium | High | Implement request batching, cache results, fallback to local OCR for high-volume users |
| Camera API not available (older phones) | Low | Medium | Graceful degradation to file upload, show helpful message |
| Offline sync failures | Medium | Medium | Implement retry queue with exponential backoff, detailed error logging |
| Poor OCR on certain merchants | High | Medium | Build merchant templates, allow easy manual override, collect feedback |
| Mobile UX complexity | Medium | Medium | Mobile-first design, extensive user testing, iterative refinement |

## Next Steps

1. **Implement Phase 1** (Mobile UX) first → immediate mobile win
2. **Parallel: Phase 2** (Split flow) → core feature completion
3. **Then: Phases 3-5** → polish and learning systems
4. **Throughout:** Instrument analytics to measure impact

---

**Estimated Total Effort:** 4-6 weeks full-time (or 8-12 weeks part-time)
**Highest Priority:** Mobile capture UX + Split flow optimization (phases 1-2)
