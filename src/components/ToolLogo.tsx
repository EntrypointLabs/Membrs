const TILE = {
  small: 'h-5 w-5 rounded-[5px] p-0.5',
  large: 'h-7 w-7 rounded-md p-1',
};

/** An assistant's logo on a white tile, so dark marks stay visible on the dark theme. */
export function ToolLogo({
  src,
  size = 'small',
}: {
  src: string;
  size?: keyof typeof TILE;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center bg-white ${TILE[size]}`}
    >
      <img src={src} alt="" className="h-full w-full object-contain" />
    </span>
  );
}
