import type { ReactNode } from 'react';

type Props = { category: string; size?: number };

export default function CategoryArt({ category, size = 32 }: Props) {
  let art: ReactNode;

  switch (category) {
    case 'Food & drink':
      art = <>
        <path d="M6 20c0-7 6-12 14-12s14 5 14 12" fill="#efa943" />
        <path d="m7 19 4-7 5 4 5-6 5 6 5-3 3 7" fill="#42975d" />
        <circle cx="15" cy="17" r="3" fill="#dc6049" />
        <circle cx="27" cy="17" r="3" fill="#dc6049" />
        <path d="M4 20h32c-1 9-7 14-16 14S5 29 4 20Z" fill="#f1b649" />
        <path d="M8 23h24" fill="none" stroke="#dd8a30" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="27" r="1" fill="#dd8a30" />
        <circle cx="20" cy="30" r="1" fill="#dd8a30" />
        <circle cx="28" cy="27" r="1" fill="#dd8a30" />
      </>;
      break;
    case 'Water activities':
      art = <>
        <circle cx="29" cy="10" r="5" fill="#f4b949" />
        <path d="M4 25c4-5 7-5 11 0s7 5 11 0 7-5 10-1v8H4Z" fill="#65bde2" />
        <path d="M4 31c4-4 7-4 11 0s7 4 11 0 7-4 10-1v6H4Z" fill="#278ec5" />
        <path d="m7 18 20-4-7 10c-5 0-10-2-13-6Z" fill="#36a59a" />
        <path d="m12 10 14 14" fill="none" stroke="#bd7741" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m9 7 5 2 2 5-5-2Z" fill="#eb9f53" />
      </>;
      break;
    case 'Sports & games':
      art = <>
        <circle cx="20" cy="21" r="14" fill="#e8964d" />
        <path d="M6 21h28M20 7v28M10 11c11 5 9 16 20 20M30 11c-11 5-9 16-20 20" fill="none" stroke="#72529a" strokeWidth="2" />
        <circle cx="20" cy="21" r="14" fill="none" stroke="#72529a" strokeWidth="2" />
        <path d="m32 3 1.4 3.6L37 8l-3.6 1.4L32 13l-1.4-3.6L27 8l3.6-1.4Z" fill="#b998d5" />
      </>;
      break;
    case 'Parks & nature':
      art = <>
        <circle cx="30" cy="9" r="5" fill="#ecc261" />
        <path d="M3 33c7-5 25-5 34 0v3H3Z" fill="#a8cf91" />
        <path d="M13 23v11M27 25v9" fill="none" stroke="#a26d47" strokeWidth="3" strokeLinecap="round" />
        <path d="m13 4 8 12h-4l7 11H2l7-11H5Z" fill="#438c60" />
        <path d="m27 14 6 9h-3l6 8H18l6-8h-3Z" fill="#70a96a" />
      </>;
      break;
    case 'Entertainment':
      art = <>
        <path d="m5 10 24-5 6 24-24 5-2-7a4 4 0 0 0-2-8Z" fill="#ab80b7" />
        <path d="M7 12h27v6a4 4 0 0 0 0 8v6H7v-6a4 4 0 0 0 0-8Z" fill="#e3819c" />
        <path d="M26 15v3m0 4v2m0 4v1" fill="none" stroke="#ac4c72" strokeWidth="2" strokeLinecap="round" />
        <path d="m17 16 1.5 3.6 4 .4-3 2.6.9 3.9-3.4-2-3.4 2 .9-3.9-3-2.6 4-.4Z" fill="#fff0cd" />
      </>;
      break;
    case 'Day trips':
      art = <>
        <circle cx="29" cy="10" r="5" fill="#e9ad4f" />
        <path d="m2 26 11-17 10 15 6-8 9 12H2Z" fill="#7faaa1" />
        <path d="m9 15 4-6 4 6-4-1Z" fill="#e8f0df" />
        <path d="M3 30c8-6 20-6 34 0v6H3Z" fill="#b8c88b" />
        <path d="M19 23h4c-7 6 7 7 7 13H12c0-7 13-7 7-13Z" fill="#ac8349" />
        <path d="M21 26c-2 3 2 4 2 7" fill="none" stroke="#ffe7ac" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 3" />
      </>;
      break;
    default:
      art = <>
        <path d="m4 10 10-4 12 4 10-4v26l-10 4-12-4-10 4Z" fill="#b4d7b4" />
        <path d="m14 6 12 4v26l-12-4Z" fill="#6eb8ae" />
        <path d="m4 24 10-7 12 8 10-8" fill="none" stroke="#eff6db" strokeWidth="3" />
        <path d="M29 5a7 7 0 0 0-7 7c0 5 7 11 7 11s7-6 7-11a7 7 0 0 0-7-7Z" fill="#d66b50" />
        <circle cx="29" cy="12" r="2.5" fill="#fff3dd" />
      </>;
  }

  return <svg className="category-illustration" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" focusable="false">{art}</svg>;
}
