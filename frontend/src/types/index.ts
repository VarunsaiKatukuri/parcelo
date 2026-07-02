export type OrderItem = {
  name: string
  qty: number
  price: number
}

export type Order = {
  id: string
  created_at: string
  customer_name: string
  customer_phone: string
  items: OrderItem[]
  subtotal: number
  grand_total: number
  delivery_address: string
  latitude: number
  longitude: number
  status: 'PENDING_DELIVERY' | 'ASSIGNED' | 'DELIVERED'
}
