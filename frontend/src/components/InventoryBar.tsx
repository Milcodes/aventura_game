import { useState } from 'react'
import './InventoryBar.css'

interface Currency {
  id: string
  name: string
  icon: string
  value: number
}

interface Item {
  id: string
  name: string
  icon: string
  quantity: number
}

interface InventoryBarProps {
  currencies: Currency[]
  items: Item[]
}

export default function InventoryBar({ currencies, items }: InventoryBarProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  return (
    <>
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
            className={`inventory-toggle ${isPanelOpen ? 'active' : ''}`}
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            aria-label="Toggle Inventory"
          >
            <span className="inventory-icon">🎒</span>
            <span className="inventory-label">Inventory</span>
            <span className="inventory-arrow">{isPanelOpen ? '▼' : '▲'}</span>
          </button>
        </div>
      </div>

      {/* Inventory Panel (slides up from bottom) */}
      <div className={`inventory-panel ${isPanelOpen ? 'open' : ''}`}>
        <div className="inventory-panel-header">
          <h3 className="inventory-panel-title">🎒 Leltár</h3>
          <button
            className="inventory-panel-close"
            onClick={() => setIsPanelOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="inventory-panel-content">
          {items.length === 0 ? (
            <p className="inventory-empty">Még nincsenek tárgyaid</p>
          ) : (
            <div className="inventory-items-grid">
              {items.map((item) => (
                <div key={item.id} className="inventory-item-card">
                  <div className="item-icon-large">{item.icon}</div>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">×{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay when panel is open */}
      {isPanelOpen && (
        <div
          className="inventory-overlay"
          onClick={() => setIsPanelOpen(false)}
        />
      )}
    </>
  )
}
