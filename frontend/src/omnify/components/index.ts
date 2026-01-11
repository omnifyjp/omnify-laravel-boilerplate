import { JapaneseNameField } from './JapaneseNameField.js';
import { JapaneseAddressField } from './JapaneseAddressField.js';
import { JapaneseBankField } from './JapaneseBankField.js';

// Namespace style exports (recommended)
export const OmnifyForm = {
  JapaneseName: JapaneseNameField,
  JapaneseAddress: JapaneseAddressField,
  JapaneseBank: JapaneseBankField,
} as const;

// Legacy exports (backward compatible)
export { JapaneseNameField, JapaneseAddressField, JapaneseBankField };
