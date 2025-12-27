interface Transaction {
  id: string
  creatorAmount: number
  user: {
    name: string | null
    email: string | null
  } | null
}

interface RecentSalesProps {
  transactions: Transaction[]
  totalSales: number
}

export function RecentSales({ transactions, totalSales }: RecentSalesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount / 100)
  }

  return (
    <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
      <div className="p-6 flex flex-col space-y-2">
        <h3 className="font-semibold leading-none tracking-tight">
          Recent Sales
        </h3>
        <p className="text-sm text-muted-foreground">
          You made {totalSales} sales this month.
        </p>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-8">
          {transactions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No transctions yet.
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {(t.user?.name || "U")[0].toUpperCase()}
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {t.user?.name || "Anonymous"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.user?.email || ""}
                  </p>
                </div>
                <div className="ml-auto font-medium">
                  +{formatCurrency(t.creatorAmount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
