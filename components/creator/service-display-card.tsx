import { Card, CardContent } from "@/components/ui/card"

interface ServiceDisplayCardProps {
  name: string
  description: string
  price: number
}

export function ServiceDisplayCard({
  name,
  description,
  price,
}: ServiceDisplayCardProps) {
  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg mb-1">{name}</h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {description}
              </p>
            )}
          </div>
          <div className="pt-2 border-t">
            <p className="text-primary font-semibold text-lg">
              Rs. {price.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

