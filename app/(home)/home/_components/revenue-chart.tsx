interface RevenueChartProps {
  data: { date: string; amount: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  // A very simple visual representation since we don't have Recharts installed
  // We will map the data to simple bars.

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
        No data to display
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => d.amount)) || 1

  return (
    <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
      <div className="p-6 flex flex-col space-y-2">
        <h3 className="font-semibold leading-none tracking-tight">Overview</h3>
        <p className="text-sm text-muted-foreground">
          Revenue over the last 30 days
        </p>
      </div>
      <div className="p-6 pt-0 pl-2">
        <div className="h-[350px] flex items-end justify-between gap-2 px-2">
          {data.map((item, i) => {
            const heightPercentage = (item.amount / maxVal) * 100
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1 flex-1 group"
              >
                <div
                  className="w-full bg-primary/20 rounded-t-sm transition-all group-hover:bg-primary/50 relative"
                  style={{ height: `${heightPercentage}%`, minHeight: "4px" }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.date} : {item.amount / 100}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
