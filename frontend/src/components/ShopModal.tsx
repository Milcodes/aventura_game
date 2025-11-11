import { useState, useEffect } from 'react'
import ModalRoot from './ModalRoot'
import './ShopModal.css'

interface ShopItem {
  id: string
  name: string
  icon: string
  price: number
  currencyType: string // 'gold', 'crystal', etc.
  description?: string
}

interface ShopModalProps {
  isOpen: boolean
  onClose: (result: ShopResult | null) => void
  items: ShopItem[]
  availableCurrency: { [key: string]: number } // e.g., { gold: 150, crystal: 5 }
}

export interface ShopResult {
  type: 'SHOP'
  modal_id: string
  purchased: boolean
  items: Array<{
    id: string
    name: string
    icon: string
    price: number
    currencyType: string
  }>
  totalCost: { [key: string]: number }
}

export default function ShopModal({
  isOpen,
  onClose,
  items,
  availableCurrency
}: ShopModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [totalCost, setTotalCost] = useState<{ [key: string]: number }>({})
  const [canAfford, setCanAfford] = useState(true)

  useEffect(() => {
    if (!isOpen) {
      setSelectedItems(new Set())
      setTotalCost({})
      setCanAfford(true)
    }
  }, [isOpen])

  useEffect(() => {
    // Calculate total cost
    const cost: { [key: string]: number } = {}

    selectedItems.forEach((itemId) => {
      const item = items.find((i) => i.id === itemId)
      if (item) {
        cost[item.currencyType] = (cost[item.currencyType] || 0) + item.price
      }
    })

    setTotalCost(cost)

    // Check if player can afford
    const affordable = Object.keys(cost).every(
      (currency) => (availableCurrency[currency] || 0) >= cost[currency]
    )
    setCanAfford(affordable)
  }, [selectedItems, items, availableCurrency])

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handlePurchase = () => {
    if (!canAfford || selectedItems.size === 0) return

    const purchasedItems = items
      .filter((item) => selectedItems.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        price: item.price,
        currencyType: item.currencyType
      }))

    const result: ShopResult = {
      type: 'SHOP',
      modal_id: 'shop',
      purchased: true,
      items: purchasedItems,
      totalCost
    }

    onClose(result)
  }

  const handleSkip = () => {
    const result: ShopResult = {
      type: 'SHOP',
      modal_id: 'shop',
      purchased: false,
      items: [],
      totalCost: {}
    }

    onClose(result)
  }

  const getCurrencyIcon = (currencyType: string): string => {
    const icons: { [key: string]: string } = {
      gold: '💰',
      crystal: '💎',
      mana: '⚗️'
    }
    return icons[currencyType] || '💰'
  }

  const getCurrencyName = (currencyType: string): string => {
    const names: { [key: string]: string } = {
      gold: 'Arany',
      crystal: 'Kristály',
      mana: 'Akámi'
    }
    return names[currencyType] || currencyType
  }

  return (
    <ModalRoot
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title="🛒 Árus"
      size="large"
      closeOnOverlay={false}
      closeOnEsc={false}
      showCloseButton={false}
    >
      <div className="shop-modal-container">
        {/* Player's currency display */}
        <div className="shop-currency-display">
          <div className="shop-currency-title">A pénzed:</div>
          <div className="shop-currency-list">
            {Object.keys(availableCurrency).map((currencyType) => (
              <div key={currencyType} className="shop-currency-item">
                <span className="currency-icon">{getCurrencyIcon(currencyType)}</span>
                <span className="currency-value">{availableCurrency[currencyType]}</span>
                <span className="currency-name">{getCurrencyName(currencyType)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items for sale */}
        <div className="shop-items-section">
          <div className="shop-items-title">Vásárolható tárgyak:</div>
          <div className="shop-items-grid">
            {items.map((item) => {
              const isSelected = selectedItems.has(item.id)
              const playerCurrency = availableCurrency[item.currencyType] || 0
              const canAffordItem = playerCurrency >= item.price

              return (
                <div
                  key={item.id}
                  className={`shop-item-card ${isSelected ? 'selected' : ''} ${
                    !canAffordItem ? 'unaffordable' : ''
                  }`}
                  onClick={() => canAffordItem && toggleItem(item.id)}
                >
                  <div className="shop-item-checkbox">
                    {isSelected && <span>✓</span>}
                  </div>
                  <div className="shop-item-icon">{item.icon}</div>
                  <div className="shop-item-name">{item.name}</div>
                  {item.description && (
                    <div className="shop-item-description">{item.description}</div>
                  )}
                  <div className="shop-item-price">
                    <span className="price-icon">{getCurrencyIcon(item.currencyType)}</span>
                    <span className="price-value">{item.price}</span>
                  </div>
                  {!canAffordItem && (
                    <div className="shop-item-unaffordable-badge">Nincs elég pénzed</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Total cost */}
        {selectedItems.size > 0 && (
          <div className="shop-total-section">
            <div className="shop-total-label">Összesen:</div>
            <div className="shop-total-cost">
              {Object.keys(totalCost).map((currencyType) => (
                <div key={currencyType} className="shop-total-currency">
                  <span className="total-icon">{getCurrencyIcon(currencyType)}</span>
                  <span className="total-value">{totalCost[currencyType]}</span>
                </div>
              ))}
            </div>
            {!canAfford && (
              <div className="shop-cannot-afford-message">
                ⚠️ Nincs elég pénzed ehhez a vásárláshoz
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="shop-actions">
          <button className="shop-skip-btn" onClick={handleSkip}>
            Nem vásárolok
          </button>
          <button
            className="shop-purchase-btn"
            onClick={handlePurchase}
            disabled={selectedItems.size === 0 || !canAfford}
          >
            {selectedItems.size === 0
              ? 'Válassz tárgyakat'
              : canAfford
              ? `Vásárlás (${selectedItems.size} tárgy)`
              : 'Nincs elég pénzed'}
          </button>
        </div>
      </div>
    </ModalRoot>
  )
}
