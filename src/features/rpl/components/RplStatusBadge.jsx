import { Badge } from '../../../components/ui'
import { getStatusDefinition, localize } from '../domain/rpl'

export default function RplStatusBadge({ status, domain = 'application', language = 'en', className = '' }) {
  const definition = getStatusDefinition(status, domain)
  return (
    <Badge variant={definition.variant} className={`whitespace-nowrap ${className}`}>
      {localize(definition.labels, language) || String(status || '—').replaceAll('_', ' ')}
    </Badge>
  )
}
