/**
 * Compatibility bridge – re-exports from the canonical module.
 * Prevents ENOENT build errors when stale imports reference this path.
 */
export {
  detectInstallment,
  detectSiblingInstallment,
  normalizeForSibling,
  normalizeStoreName,
  type DetectedInstallment,
  type DetectedSibling,
  type KnownInstallmentGroup,
} from './installmentGroupId';
// sync
