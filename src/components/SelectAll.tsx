'use client';

/** Header checkbox that ticks every row checkbox in the listing table. */
export default function SelectAll() {
  return <input type="checkbox" aria-label="Select all listings" onChange={(e) => {
    document.querySelectorAll<HTMLInputElement>('input[name="select"]').forEach((box) => { box.checked = e.target.checked; });
  }} />;
}
