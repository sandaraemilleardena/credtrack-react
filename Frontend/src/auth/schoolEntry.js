// Temporary UI PIN gate; account/API authorization remains server-side.
let unlocked = false;
export function unlockSchoolEntry(pin) { unlocked = /^\d{4}$/.test(pin) && pin === '1025'; return unlocked; }
export function hasSchoolEntry() { return unlocked; }
export function clearSchoolEntry() { unlocked = false; }
