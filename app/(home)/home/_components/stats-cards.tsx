import {
  DollarSign,
  Users,
  CreditCard,
  Activity,
  LucideIcon,
} from "lucide-react"

interface Stats {
  totalRevenue: number
  totalFollowers: number
  totalSales: number
}

interface StatsCardsProps {
  stats: Stats
}

function Card({
  title,
  icon: Icon,
  value,
  subtext,
}: {
  title: string
  icon: LucideIcon
  value: string
  subtext: string
}) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium">{title}</h3>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="p-6 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </div>
    </div>
  )
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount / 100) // stored in paise
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card
        title="Total Revenue"
        icon={DollarSign}
        value={formatCurrency(stats.totalRevenue)}
        subtext="+20.1% from last month"
      />
      <Card
        title="Followers"
        icon={Users}
        value={stats.totalFollowers.toString()}
        subtext="+180 new followers"
      />
      <Card
        title="Sales"
        icon={CreditCard}
        value={stats.totalSales.toString()}
        subtext="+19% from last month"
      />
      <Card
        title="Active Now"
        icon={Activity}
        value="+0"
        subtext="No active user (Realtime WIP)"
      />
    </div>
  )
}
