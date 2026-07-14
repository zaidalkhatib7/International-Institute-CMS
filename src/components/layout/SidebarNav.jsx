import { NavLink } from 'react-router-dom'

function SidebarItem({ item }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.href}
      style={({ isActive }) =>
        isActive
          ? { backgroundColor: '#FFFFFF', color: 'var(--color-primary)' }
          : undefined
      }
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'shadow-sm'
            : 'text-[#DDEAF0] hover:bg-white/8 hover:text-white'
        }`
      }
    >
      <Icon size={18} strokeWidth={1.9} className="shrink-0" />
      <span className="min-w-0 flex-1 leading-6">{item.name}</span>
    </NavLink>
  )
}

export default function SidebarNav({ groups = [] }) {
  return (
    <div className="space-y-5">
      {groups.map((group, groupIndex) => (
        <section key={group.label || `group-${groupIndex}`}>
          {group.label ? (
            <p className="mb-2 px-3.5 text-[11px] font-semibold tracking-wide text-[#8FB0C2]">
              {group.label}
            </p>
          ) : null}
          <div className="space-y-1">
            {group.items.map((item) => (
              <SidebarItem key={item.href} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
