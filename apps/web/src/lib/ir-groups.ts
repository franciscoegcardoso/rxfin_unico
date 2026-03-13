/**
 * IR code → asset type / label / target table.
 * Stub: implement mapping in next step.
 */

export function irCodeToAssetType(irItemCode: string): string {
  // TODO: map IR item code to user_assets.type / asset_type
  return irItemCode?.split('-')[0] ?? 'other';
}

export function irCodeToLabel(irItemCode: string): string {
  // TODO: human-readable label for IR code
  return irItemCode ?? 'Bem';
}

export function irCodeToTargetTable(irItemCode: string): string {
  // TODO: map to target table for new_asset (e.g. user_assets, real_estate, etc.)
  return 'user_assets';
}
