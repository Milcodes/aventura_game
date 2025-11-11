import ModalRoot from './ModalRoot'
import './InventoryModal.css'

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

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  currencies: Currency[]
  items: Item[]
}

export default function InventoryModal({ isOpen, onClose, currencies, items }: InventoryModalProps) {
  return (
    <ModalRoot
      isOpen={isOpen}
      onClose={onClose}
      title="🎒 Leltár"
      size="medium"
    >
      <div className="inventory-modal-body">
        {/* Resources Section */}
        {currencies.length > 0 && (
          <section className="inventory-section">
            <h3 className="inventory-section-title">Erőforrások</h3>
            <div className="inventory-currencies-grid">
              {currencies.map((currency) => (
                <div key={currency.id} className="inventory-currency-card">
                  <span className="currency-icon-large">{currency.icon}</span>
                  <div className="currency-details">
                    <span className="currency-name">{currency.name}</span>
                    <span className="currency-value-large">{currency.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Items Section */}
        <section className="inventory-section">
          <h3 className="inventory-section-title">Tárgyak</h3>
          {items.length === 0 ? (
            <p className="inventory-empty-message">Még nincsenek tárgyaid</p>
          ) : (
            <div className="inventory-items-grid">
              {items.map((item) => (
                <div key={item.id} className="inventory-item-card-modal">
                  <div className="item-icon-large">{item.icon}</div>
                  <div className="item-details">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">×{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Close Button */}
        <div className="inventory-modal-footer">
          <button className="inventory-close-btn" onClick={onClose}>
            Bezár
          </button>
        </div>
      </div>
    </ModalRoot>
  )
}
