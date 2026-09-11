const RowSkeleton = () => (
  <div className="px-5 py-3.5 flex items-center gap-3">
    <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
      <div className="h-2.5 w-2/3 bg-gray-50 rounded animate-pulse" />
    </div>
  </div>
);

export { RowSkeleton };
