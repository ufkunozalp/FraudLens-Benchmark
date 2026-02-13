/**
 * Backward-compatible facade for AI services.
 * Existing imports continue to use `services/aiService`.
 */

export { generateImage } from './ai/generation';
export { detectFraud } from './ai/detection';
export { editImage } from './ai/editing';
