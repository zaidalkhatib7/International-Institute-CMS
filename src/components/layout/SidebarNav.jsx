import { NavLink } from 'react-router-dom'

function SidebarItem({ item }) {
  const Icon = item.icon
  const itemLabel = item.label ?? item.name ?? 'Item'
  const itemPath = item.path ?? item.href ?? '/'

  return (
    <NavLink
      to={itemPath}
      className={({ isActive }) =>
        `flex items-center gap-4 rounded-2xl px-5 py-4 text-base font-medium transition-all ${
          isActive
            ? 'bg-[rgba(255,255,255,0.10)] text-white'
            : 'text-[#E6EDF5] hover:bg-[rgba(255,255,255,0.06)] hover:text-white'
        }`
      }
    >
      <Icon size={22} />
      <span>{itemLabel}</span>
    </NavLink>
  )
}

export default function SidebarNav({ items = [] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <SidebarItem
          key={item.path ?? item.href ?? item.label ?? item.name ?? index}
          item={item}
        />
      ))}
    </div>
  )
}