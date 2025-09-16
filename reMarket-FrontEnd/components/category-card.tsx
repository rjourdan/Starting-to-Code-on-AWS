import Link from "next/link"
import { Book, Dumbbell, Gamepad2, type LucideIcon, Shirt, Smartphone, Sofa } from "lucide-react"

interface CategoryCardProps {
  name: string
  icon: string
  count: number
}

export function CategoryCard({ name, icon, count }: CategoryCardProps) {
  const getIcon = (iconName: string): LucideIcon => {
    const icons: Record<string, LucideIcon> = {
      dumbbell: Dumbbell,
      shirt: Shirt,
      smartphone: Smartphone,
      "gamepad-2": Gamepad2,
      sofa: Sofa,
      "book-open": Book,
    }

    return icons[iconName] || Dumbbell
  }

  const IconComponent = getIcon(icon)

  return (
    <Link
      href={`/category/${name.toLowerCase()}`}
      className="bg-white rounded-lg p-4 border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center"
    >
      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
        <IconComponent className="h-6 w-6 text-emerald-600" />
      </div>
      <h3 className="font-medium">{name}</h3>
      <p className="text-sm text-gray-500">{count} items</p>
    </Link>
  )
}

