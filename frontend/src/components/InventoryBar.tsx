import './InventoryBar.css'

interface Currency {
  id: string
  name: string
  icon: string
  value: number
}

interface InventoryBarProps {
  currencies: Currency[]
  onOpenInventory: () => void
}

export default function InventoryBar({ currencies, onOpenInventory }: InventoryBarProps) {
  return (
    <div className="inventory-bar">
      <div className="inventory-bar-container">
        {/* Currencies */}
        <div className="inventory-currencies">
          {currencies.map((currency) => (
            <div key={currency.id} className="currency-item" title={currency.name}>
              <span className="currency-icon">{currency.icon}</span>
              <span className="currency-value">{currency.value}</span>
            </div>
          ))}
        </div>

        {/* Inventory Toggle Button */}
        <button
          className="inventory-toggle"
          onClick={onOpenInventory}
          aria-label="Open Inventory"
        >
          <span className="inventory-icon">🎒</span>
          <span className="inventory-label">Inventory</span>
        </button>
      </div>
    </div>
  )
}
