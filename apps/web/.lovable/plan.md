

## Problem Analysis

**Root Cause**: `PlanDialog.tsx` bypasses the admin governance flow entirely. It uses `useSubscriptionPlanMutations()` (direct mutations) instead of `useAdminDeferredMutations()` (deferred/governed mutations). On submit (line 151-166), it:
1. Calls `updatePlan.mutate()` directly — saves to DB immediately without review
2. Calls `onOpenChange(false)` immediately — closes dialog before mutation completes
3. No confirmation step, no pending changes bar, no success/error feedback

The deferred governance infrastructure already exists (`deferUpdatePlan`, `deferCreatePlan` in `useAdminDeferredMutations`), but PlanDialog doesn't use it.

## Plan

### Step 1: Refactor PlanDialog to use deferred mutations

**File**: `src/components/admin/PlanDialog.tsx`

- Replace `useSubscriptionPlanMutations()` with `useAdminDeferredMutations()`
- Change `onSubmit` to call `deferUpdatePlan(id, payload, name)` or `deferCreatePlan(payload)` instead of direct `.mutate()`
- Close dialog after adding to pending changes (not after DB save)
- Show toast indicating change was queued ("Alteração adicionada — confirme na barra de salvamento")

### Step 2: Fix PlanImageUpload to not trigger navigation

**File**: `src/components/admin/PlanImageUpload.tsx`

- The upload to storage is fine (images need to be uploaded before form submit to get the URL)
- Ensure no redirect/navigation occurs after upload — the current code looks correct, but verify there's no side effect causing the redirect the user reported

### Step 3: Audit all other admin pages for governance compliance

Check each admin page's dialog/form component to ensure they use `useAdminDeferredMutations` instead of direct mutations:

- **PagesTab** (`PageDialog`) — already uses deferred ✓
- **PlanComparisonManager** — already uses deferred ✓  
- **UsersTab** / `UserEditDialog` — needs verification
- **NotificationTemplatesManager** — needs verification
- **LegalDocumentsTab** — needs verification
- **AppSettingsCard** / `FeatureSettingsCard` / `AuthFlowSettingsCard` — needs verification

Each non-compliant component will be refactored to route through `useAdminDeferredMutations`, adding appropriate `deferXxx` functions where missing.

### Step 4: Ensure query invalidation covers all surfaces

In `useAdminDeferredMutations`, the deferred plan operations already call `queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })`. Since `useSubscriptionPlans` uses `staleTime: 0` and the query key `['subscription-plans', includePrivate]`, the invalidation pattern `['subscription-plans']` will correctly invalidate both the admin view (`includePrivate=true`) and the public-facing pages (landing, web `/planos`, app) which use `includePrivate=false`.

### Technical Details

```text
Current flow (broken):
  PlanDialog → useSubscriptionPlanMutations → mutate() → DB (immediate, no review)
                                                         → close dialog (no feedback)

Fixed flow (governed):
  PlanDialog → useAdminDeferredMutations → deferUpdatePlan() → pending changes bar
             → close dialog with "queued" toast
             → user reviews in AdminSaveConfirmDialog
             → confirms → execute() → DB → invalidate queries → success toast
```

Key change in `PlanDialog.onSubmit`:
```typescript
// BEFORE (direct, ungoverned)
updatePlan.mutate({ id: plan.id, ...payload });
onOpenChange(false);

// AFTER (deferred, governed)  
deferUpdatePlan(plan.id, payload, plan.name);
onOpenChange(false);
toast.info('Alteração adicionada para revisão');
```

