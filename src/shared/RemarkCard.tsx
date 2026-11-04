type Props = {
  remark: string;
  /** "row" is the compact list size, "sheet" is the large details size. */
  size?: 'card' | 'row' | 'sheet';
};

/** True when the text starts in a right-to-left script such as Hebrew or Arabic. */
const startsRtl = (text: string) => /^[^A-Za-z\u0590-\u08FF]*[\u0590-\u08FF]/.test(text);

/** The owner's notes about a place, on a soft beige card. */
export default function RemarkCard({ remark, size = 'card' }: Props) {
  // Show blank lines as a single line break. The saved text is not changed.
  const text = remark.trim().replace(/\n\s*\n+/g, '\n');
  if (!text) return null;
  return (
    <figure className={`remark remark--${size}`} dir={startsRtl(text) ? 'rtl' : 'ltr'}>
      <figcaption className="remark-label">Notes</figcaption>
      <blockquote className="remark-text">{text}</blockquote>
    </figure>
  );
}
