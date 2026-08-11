import { DEFAULT_COMPOSERS } from '../config';

export const getComposers = (composers: any): string => {
  if (!composers) return DEFAULT_COMPOSERS.join(', ');
  
  if (Array.isArray(composers)) {
    const valid = composers.filter(c => typeof c === 'string' && c.trim() !== '');
    return valid.length > 0 ? valid.join(', ') : DEFAULT_COMPOSERS.join(', ');
  }
  
  if (typeof composers === 'string') {
    try {
      const parsed = JSON.parse(composers);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(c => typeof c === 'string' && c.trim() !== '');
        return valid.length > 0 ? valid.join(', ') : DEFAULT_COMPOSERS.join(', ');
      }
    } catch (e) {
      // It's a normal string
      return composers.trim() !== '' ? composers : DEFAULT_COMPOSERS.join(', ');
    }
  }
  
  return DEFAULT_COMPOSERS.join(', ');
};
