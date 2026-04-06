import { NavLink } from 'react-router-dom'

function SidebarItem({ item }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-base transition-all ${
          isActive
            ? 'bg-[rgba(254,216,144,0.12)] text-[var(--color-secondary)]'
            : 'text-[#CBD5E1] hover:bg-[rgba(254,216,144,0.06)] hover:text-white'
        }`
      }
    >
      <Icon size={20} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function SidebarNav({ items = [] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <SidebarItem key={item.path} item={item} />
      ))}
    </div>
  )
}