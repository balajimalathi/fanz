import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MembershipDisplayCardProps {
  title: string
  description: string
  monthlyRecurringFee: number
  coverImageUrl: string | null
}

export function MembershipDisplayCard({
  title,
  description,
  monthlyRecurringFee,
  coverImageUrl,
}: MembershipDisplayCardProps) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
      {coverImageUrl && (
        <div className="relative w-full h-40 sm:h-48 overflow-hidden">
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <CardContent className={cn("pt-6", coverImageUrl && "pt-4")}>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {description}
              </p>
            )}
          </div>
          <div className="pt-2 border-t">
            <p className="text-primary font-semibold text-lg">
              Rs. {monthlyRecurringFee.toLocaleString("en-IN")}/month
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

