import {operation} from '../api/operations';
// Account/API authorization remains independent of the school entry gate.
let unlocked = false;
let attempt = 0;
export async function unlockSchoolEntry(pin) {
  const currentAttempt = ++attempt;
  unlocked = false;
  const result = await operation('school-pin/verify/', {pin});
  if (currentAttempt !== attempt) return false;
  unlocked = result.verified === true;
  return unlocked;
}
export function hasSchoolEntry() { return unlocked; }
export function clearSchoolEntry() { attempt++; unlocked = false; }
