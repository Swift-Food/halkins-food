# Edit Event Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline "Edit Date" form to the Order Detail modal so admins can reschedule a booking's start/end times via `PATCH /coworking-dashboard/:spaceId/events/:eventId/date`.

**Architecture:** Three files change in sequence: endpoint constant → service method → UI. The UI is an inline expansion inside the existing Booking section of `OrderDetailModal`, consistent with how the reject-reason form already works.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, lucide-react icons, native `<input type="datetime-local">`

---

### Task 1: Add endpoint constant

**Files:**
- Modify: `lib/constants/api.ts:47-48`

- [ ] **Step 1: Add the constant after `COWORKING_DASHBOARD_IMPORT_EVENT`**

Open `lib/constants/api.ts`. After line 48:
```ts
  COWORKING_DASHBOARD_IMPORT_EVENT: (spaceId: string) =>
    `/coworking-dashboard/${spaceId}/events`,
```
Add:
```ts
  COWORKING_DASHBOARD_UPDATE_EVENT_DATE: (spaceId: string, eventId: string) =>
    `/coworking-dashboard/${spaceId}/events/${eventId}/date`,
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to `api.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/constants/api.ts
git commit -m "feat: add COWORKING_DASHBOARD_UPDATE_EVENT_DATE endpoint constant"
```

---

### Task 2: Add service method

**Files:**
- Modify: `services/api/coworking-dashboard.api.ts` (after the `createAdminEvent` method, around line 218)

- [ ] **Step 1: Add `updateEventDate` method to `CoworkingDashboardService`**

Open `services/api/coworking-dashboard.api.ts`. After the closing brace of `createAdminEvent` (around line 218), add:

```ts
  /**
   * Update the booking start/end times for an event.
   */
  async updateEventDate(
    spaceId: string,
    eventId: string,
    body: { bookingStartTime: string; bookingEndTime: string },
  ): Promise<DashboardOrderDetailResponse> {
    const response = await fetchWithAuth(
      `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_UPDATE_EVENT_DATE(spaceId, eventId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to update event date');
    }
    return response.json();
  }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add services/api/coworking-dashboard.api.ts
git commit -m "feat: add updateEventDate service method"
```

---

### Task 3: Add Edit Date UI to OrderDetailModal

**Files:**
- Modify: `lib/components/coworking-dashboard/OrderDetailModal.tsx`

This task is split into three sub-steps for clarity: state + helper, the edit form JSX, and the submit handler.

#### Step 1: Add state variables and datetime helper

- [ ] **Add state after the existing `venueHireFeeInput` / `depositAmountInput` state declarations (around line 185-186)**

Find:
```ts
  const [venueHireFeeInput, setVenueHireFeeInput] = useState("");
  const [depositAmountInput, setDepositAmountInput] = useState("");
```

After those two lines, add:
```ts
  const [showEditDate, setShowEditDate] = useState(false);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDateLoading, setEditDateLoading] = useState(false);
  const [editDateError, setEditDateError] = useState("");
  const [editDateSuccess, setEditDateSuccess] = useState("");
```

- [ ] **Add the `toDatetimeLocalValue` helper near the top of the file, after `getAdminReviewNotesPreview` (around line 164)**

After the `getAdminReviewNotesPreview` function, add:
```ts
function toDatetimeLocalValue(isoString: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}
```

This converts a UTC ISO string to the `YYYY-MM-DDTHH:mm` format that `datetime-local` inputs expect, adjusted for the user's local timezone.

#### Step 2: Add the submit handler

- [ ] **Add `handleEditDate` after `handleSetVenueHireFee` (around line 286)**

After the closing brace of `handleSetVenueHireFee`, add:
```ts
  const handleEditDate = async () => {
    if (!editStartTime || !editEndTime) {
      setEditDateError("Both start and end times are required");
      return;
    }
    if (new Date(editEndTime) <= new Date(editStartTime)) {
      setEditDateError("End time must be after start time");
      return;
    }
    setEditDateLoading(true);
    setEditDateError("");
    setEditDateSuccess("");
    try {
      const updated = await coworkingDashboardService.updateEventDate(
        spaceId,
        orderId,
        {
          bookingStartTime: new Date(editStartTime).toISOString(),
          bookingEndTime: new Date(editEndTime).toISOString(),
        },
      );
      setOrder(updated);
      onOrderUpdated?.();
      setShowEditDate(false);
      setEditDateSuccess("Event date updated");
      setTimeout(() => setEditDateSuccess(""), 3000);
    } catch (caughtError: unknown) {
      setEditDateError(
        caughtError instanceof Error ? caughtError.message : "Failed to update event date",
      );
    } finally {
      setEditDateLoading(false);
    }
  };
```

#### Step 3: Add Edit icon to lucide-react import

- [ ] **Add `Pencil` to the lucide-react import at the top of the file**

Find:
```ts
import {
  X,
  User,
  Mail,
  Phone,
  Hash,
  MapPin,
  Clock,
  Receipt,
  Check,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
```

Replace with:
```ts
import {
  X,
  User,
  Mail,
  Phone,
  Hash,
  MapPin,
  Clock,
  Receipt,
  Check,
  XCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
```

#### Step 4: Replace the booking time row with the inline edit form

- [ ] **Find the booking startTime row (around line 507-514)**

Find this block inside the Booking section:
```tsx
                    {order.booking.startTime && (
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDate(order.booking.startTime)}
                        {order.booking.endTime &&
                          ` - ${formatDate(order.booking.endTime)}`}
                      </p>
                    )}
```

Replace it with:
```tsx
                    {order.booking.startTime && (
                      <>
                        {showEditDate ? (
                          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                              Edit Event Date
                            </p>
                            <div className="space-y-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Start
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editStartTime}
                                  onChange={(e) => setEditStartTime(e.target.value)}
                                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  End
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editEndTime}
                                  onChange={(e) => setEditEndTime(e.target.value)}
                                  className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                />
                              </div>
                            </div>
                            {editDateError && (
                              <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                {editDateError}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={handleEditDate}
                                disabled={editDateLoading}
                                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {editDateLoading ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowEditDate(false);
                                  setEditDateError("");
                                }}
                                disabled={editDateLoading}
                                className="rounded-lg px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {formatDate(order.booking.startTime)}
                            {order.booking.endTime &&
                              ` - ${formatDate(order.booking.endTime)}`}
                            <button
                              onClick={() => {
                                setEditStartTime(toDatetimeLocalValue(order.booking.startTime));
                                setEditEndTime(toDatetimeLocalValue(order.booking.endTime));
                                setEditDateError("");
                                setEditDateSuccess("");
                                setShowEditDate(true);
                              }}
                              className="ml-auto rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              title="Edit date"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </p>
                        )}
                        {editDateSuccess && (
                          <p className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <Check className="h-3.5 w-3.5" />
                            {editDateSuccess}
                          </p>
                        )}
                      </>
                    )}
```

- [ ] **Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Manual smoke test**
  1. Open the dashboard, click into any order that has a booking start time.
  2. Confirm the pencil icon appears to the right of the booking time.
  3. Click the pencil — confirm the form expands with pre-populated start/end values in local time.
  4. Set end time earlier than start time and click Save — confirm "End time must be after start time" error appears.
  5. Set valid times and click Save — confirm the time row updates and "Event date updated" appears briefly.
  6. Click Cancel — confirm the form collapses without changes.

- [ ] **Commit**

```bash
git add lib/components/coworking-dashboard/OrderDetailModal.tsx
git commit -m "feat: add inline edit date form to OrderDetailModal"
```
