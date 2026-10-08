type IconProps = { name: string; className?: string };

// The Figma exports in /public/icons bake their stroke colour in; masking lets them follow the text colour.
export function Icon({ name, className = "" }: IconProps) {
  const mask = `url(/icons/${name}.svg) center / 100% 100% no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ mask, WebkitMask: mask }}
    />
  );
}
