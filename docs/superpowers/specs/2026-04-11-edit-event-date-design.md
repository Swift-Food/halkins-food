# Edit Event Date — Design Spec

**Date:** 2026-04-11  
**Status:** Approved

## Overview

Add an "Edit Date" affordance to the Order Detail modal that lets admins reschedule an event's booking start/end times. The backend sends an email to the member automatically; the frontend only needs to call the PATCH endpoint and reflect the updated data.

## Endpoint

```
PATCH /coworking-dashboard/:spaceId/events/:eventId/date
Body: { bookingStartTime: string, bookingEndTime: string }  // ISO 8601
Response: DashboardOrderDetailResponse
Auth: Admin role enforced server-side via JWT
```

## Files Changed

| File | Change |
|------|--------|
| `lib/constants/api.ts` | Add `COWORKING_DASHBOARD_UPDATE_EVENT_DATE` endpoint constant |
| `services/api/coworking-dashboard.api.ts` | Add `updateEventDate` service method |
| `lib/components/coworking-dashboard/OrderDetailModal.tsx` | UI — inline edit form in Booking section |

No new files. No new dependencies.

## Component Design (`OrderDetailModal`)

### New state

```ts
showEditDate: boolean          // toggles the inline edit form
editStartTime: string          // "YYYY-MM-DDTHH:mm" — value for datetime-local input
editEndTime: string            // "YYYY-MM-DDTHH:mm" — value for datetime-local input
editDateLoading: boolean
editDateError: string
editDateSuccess: string        // auto-cleared after 3s
```

### Trigger

A small edit icon button rendered to the right of the existing clock/time row in the Booking section. Only rendered when `order.booking.startTime` is present. Clicking it:
- Sets `showEditDate = true`
- Pre-populates `editStartTime` / `editEndTime` from `order.booking.startTime` / `endTime`, truncated to minute precision (`YYYY-MM-DDTHH:mm`)

### Inline form (when `showEditDate` is true)

The clock row is replaced with:
1. Two `<input type="datetime-local">` fields labelled "Start" and "End"
2. Inline red error box (`editDateError`) — shown for validation failures and API errors
3. Save + Cancel buttons (same styling as existing action buttons)

After a successful save, `showEditDate` closes and a green inline success box (`editDateSuccess = "Event date updated"`) appears in the booking section, auto-clearing after 3 seconds.

### Validation

On submit, if `editEndTime <= editStartTime`:
- Set `editDateError = "End time must be after start time"`
- Abort — do not call the API

### Submit flow

1. Set `editDateLoading = true`, clear `editDateError` and `editDateSuccess`
2. Convert `editStartTime` / `editEndTime` to full ISO strings (append `:00` seconds if needed, or use `new Date(value).toISOString()`)
3. Call `coworkingDashboardService.updateEventDate(spaceId, orderId, { bookingStartTime, bookingEndTime })`
4. **Success:** `setOrder(updated)`, `onOrderUpdated?.()`, `showEditDate = false`, `editDateSuccess = "Event date updated"` (auto-clear after 3s)
5. **Error:** `editDateError = error.message || "Failed to update event date"`
6. Always: `editDateLoading = false`

## API Layer

### Endpoint constant (`lib/constants/api.ts`)

```ts
COWORKING_DASHBOARD_UPDATE_EVENT_DATE: (spaceId: string, eventId: string) =>
  `/coworking-dashboard/${spaceId}/events/${eventId}/date`,
```

### Service method (`coworkingDashboardService`)

```ts
async updateEventDate(
  spaceId: string,
  eventId: string,
  body: { bookingStartTime: string; bookingEndTime: string }
): Promise<DashboardOrderDetailResponse> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}${API_ENDPOINTS.COWORKING_DASHBOARD_UPDATE_EVENT_DATE(spaceId, eventId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update event date');
  }
  return response.json();
}
```

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| End time ≤ start time | Inline red error, no API call |
| API error (any status) | Inline red error with message from response |
| Success | Inline green success, form closes, order data refreshed |

## Out of Scope

- Frontend role/permission gating (backend enforces admin via JWT)
- Email notification to member (handled by backend)
- Editing the date from the calendar list view directly
