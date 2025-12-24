"use client"

import { useState, useEffect } from "react"
import { Edit2, Plus, X, Eye, EyeOff, Save, Trash, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { serviceSchema } from "@/lib/validations/service"

interface Service {
  id: string
  name: string
  description: string
  price: number
  visible: boolean
  createdAt?: string
  updatedAt?: string
}

export function ServiceCard() {
  const [services, setServices] = useState<Service[]>([])
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [isAddingService, setIsAddingService] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  // Fetch services on mount
  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/services")
      if (!response.ok) {
        throw new Error("Failed to fetch services")
      }
      const data = await response.json()
      setServices(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      setMessage({ type: "error", text: "Failed to load services" })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddService = () => {
    setIsAddingService(true)
    setEditingServiceId(null)
  }

  const handleSaveService = async (service: Omit<Service, "id">) => {
    try {
      // Validate with Zod
      const validationResult = serviceSchema.safeParse(service)
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0]
        setMessage({ type: "error", text: firstError.message })
        setTimeout(() => setMessage(null), 5000)
        return
      }

      if (editingServiceId) {
        // Update existing service
        const response = await fetch(`/api/services/${editingServiceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validationResult.data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to update service")
        }

        const updatedService = await response.json()
        setServices(services.map(s =>
          s.id === editingServiceId ? updatedService : s
        ))
        setEditingServiceId(null)
        setMessage({ type: "success", text: "Service updated successfully" })
        setTimeout(() => setMessage(null), 5000)
      } else {
        // Add new service
        const response = await fetch("/api/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validationResult.data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create service")
        }

        const newService = await response.json()
        setServices([...services, newService])
        setIsAddingService(false)
        setMessage({ type: "success", text: "Service created successfully" })
        setTimeout(() => setMessage(null), 5000)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) {
      return
    }

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete service")
      }

      setServices(services.filter(s => s.id !== id))
      setMessage({ type: "success", text: "Service deleted successfully" })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleToggleServiceVisibility = async (id: string) => {
    const service = services.find(s => s.id === id)
    if (!service) return

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visible: !service.visible,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update visibility")
      }

      const updatedService = await response.json()
      setServices(services.map(s =>
        s.id === id ? updatedService : s
      ))
      setMessage({ type: "success", text: `Service ${updatedService.visible ? "shown" : "hidden"}` })
      setTimeout(() => setMessage(null), 5000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setMessage({ type: "error", text: errorMessage })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-primary">Services</h2>
        </div>
        <Button onClick={handleAddService} size="sm" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            className={cn(
              "rounded-md p-3 text-sm",
              message.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 border border-green-200 dark:border-green-800"
                : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-200 dark:border-red-800"
            )}
          >
            {message.text}
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading services...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchServices}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            {isAddingService && (
              <ServiceForm
                onSave={handleSaveService}
                onCancel={() => setIsAddingService(false)}
              />
            )}

            {services.length === 0 && !isAddingService ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No services yet. Click "Add Service" to create your first service.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {services.map((service) => (
                  <ServiceSection
                    key={service.id}
                    service={service}
                    isEditing={editingServiceId === service.id}
                    onEdit={() => setEditingServiceId(service.id)}
                    onSave={handleSaveService}
                    onCancel={() => setEditingServiceId(null)}
                    onDelete={handleDeleteService}
                    onToggleVisibility={handleToggleServiceVisibility}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}


interface ServiceCardProps {
  service: Service
  isEditing: boolean
  onEdit: () => void
  onSave: (service: Omit<Service, "id">) => void
  onCancel: () => void
  onDelete: (id: string) => void
  onToggleVisibility: (id: string) => void
}

function ServiceSection({
  service,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggleVisibility,
}: ServiceCardProps) {
  const [name, setName] = useState(service.name)
  const [description, setDescription] = useState(service.description)
  const [price, setPrice] = useState(service.price.toString())

  const handleSave = () => {
    onSave({
      name,
      description,
      price: parseFloat(price) || 0,
      visible: service.visible,
    })
  }

  if (isEditing) {
    return (
      <Card className="border-2">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`service-name-${service.id}`}>Service Name</Label>
            <Input
              id={`service-name-${service.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Fan Connect - 15 min video call"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`service-description-${service.id}`}>Description</Label>
            <Textarea
              id={`service-description-${service.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your service..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`service-price-${service.id}`}>Price (Rs.)</Label>
            <Input
              id={`service-price-${service.id}`}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleVisibility(service.id)}
              >
                {service.visible ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hidden
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(service.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onCancel()
                  setName(service.name)
                  setDescription(service.description)
                  setPrice(service.price.toString())
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "transition-colors",
      !service.visible && "opacity-60"
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{service.name}</h3>
              {!service.visible && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Hidden
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            <p className="text-primary font-medium">
              Rs. {service.price.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label="Edit service"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleVisibility(service.id)}
              aria-label="Toggle visibility"
            >
              {service.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ServiceFormProps {
  onSave: (service: Omit<Service, "id">) => void
  onCancel: () => void
}

function ServiceForm({ onSave, onCancel }: ServiceFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [visible, setVisible] = useState(true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      description,
      price: parseFloat(price) || 0,
      visible,
    })
    // Reset form
    setName("")
    setDescription("")
    setPrice("")
    setVisible(true)
  }

  return (
    <Card className="border-2 border-primary">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-service-name">Service Name</Label>
            <Input
              id="new-service-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Fan Connect - 15 min video call"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-service-description">Description</Label>
            <Textarea
              id="new-service-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your service..."
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-service-price">Price (Rs.)</Label>
            <Input
              id="new-service-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisible(!visible)}
              >
                {visible ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hidden
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save Service
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}