interface SectionHeaderProps {
  badge?: string
  badgeColor?: "emerald" | "cyan" | "blue" | "purple" | "pink" | "orange"
  title: string
  description?: string
}

const colorClasses = {
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  purple: "border-purple-500/20 bg-purple-500/10 text-purple-400",
  pink: "border-pink-500/20 bg-pink-500/10 text-pink-400",
  orange: "border-orange-500/20 bg-orange-500/10 text-orange-400",
}

export const SectionHeader = ({ badge, badgeColor = "emerald", title, description }: SectionHeaderProps) => {
  return (
    <div className="text-center mb-8">
      {badge && (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${colorClasses[badgeColor]} text-[10px] font-medium mb-4 uppercase tracking-widest`}>
          {badge}
        </div>
      )}
      <h2 className="text-4xl md:text-5xl font-medium tracking-tight font-newsreader text-foreground mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground/60 max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  )
}
