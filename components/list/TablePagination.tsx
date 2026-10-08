import { Icon } from "@/components/ui/Icon";
import { Listbox } from "@/components/ui/Listbox";

const PAGE_SIZES = [10, 20, 50];

const arrowClass = "flex size-8 items-center justify-center text-ink disabled:opacity-30";

export function TablePagination({
  page,
  pageSize,
  total,
  noun,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Plural, e.g. "clients". */
  noun: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 text-[11px] leading-[1.4] text-muted sm:px-8">
      <p>
        Showing {firstRow}–{lastRow} of {total.toLocaleString()} {noun}
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1">
          Rows per page:
          <Listbox
            value={String(pageSize)}
            onChange={(size) => onPageSizeChange(Number(size))}
            options={PAGE_SIZES.map((size) => ({ id: String(size), name: String(size) }))}
            label="Rows per page"
            className="flex cursor-pointer items-center gap-1 focus:outline-none"
          >
            {(isOpen) => (
              <>
                {pageSize}
                <Icon
                  name="chevron-down"
                  className={`size-3.5 text-ink transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </>
            )}
          </Listbox>
        </label>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={arrowClass}
        >
          <Icon name="chevron-left" className="size-3.5" />
        </button>
        <span className="text-primary">
          {page}
          {lastPage > 1 && <span className="text-muted"> / {lastPage}</span>}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Next page"
          className={arrowClass}
        >
          <Icon name="chevron-right" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
