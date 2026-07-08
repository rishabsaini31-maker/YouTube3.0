export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={className || 'flex items-center justify-center py-20'}>
      <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
    </div>
  )
}