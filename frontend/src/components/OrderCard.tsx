'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, MapPin, Package, Clock, IndianRupee, ArrowRight } from 'lucide-react'
import { Order } from '@/types'
import { format } from 'date-fns'
import { DeliveryModal } from './DeliveryModal'

interface OrderCardProps {
  order: Order
  onStatusUpdate: () => void
}

export function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT': return { label: 'Unpaid', color: 'bg-amber-500/10 text-amber-600 border-amber-200' }
      case 'PENDING_DELIVERY': return { label: 'Preparing', color: 'bg-blue-500/10 text-blue-600 border-blue-200' }
      case 'ASSIGNED': return { label: 'Dispatched', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
      case 'DELIVERED': return { label: 'Delivered', color: 'bg-slate-500/10 text-slate-600 border-slate-200' }
      default: return { label: status, color: 'bg-slate-100 text-slate-600' }
    }
  }

  const status = getStatusInfo(order.status)

  return (
    <>
      <div className="premium-card group">
        <div className="flex justify-between items-start mb-6">
          <div>
            <Badge variant="outline" className={`${status.color} font-bold px-3 py-1 rounded-full border mb-3`}>
              {status.label}
            </Badge>
            <h3 className="text-2xl font-black tracking-tight text-foreground">{order.customer_name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5 font-medium">
              <Clock size={14} />
              {format(new Date(order.created_at), 'h:mm a')}
            </div>
          </div>
          <div className="bg-muted p-2 rounded-xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Package size={20} />
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground/80 bg-muted/30 p-3 rounded-2xl">
            <Phone size={16} className="text-primary" />
            <span>{order.customer_phone}</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-muted-foreground px-1">
            <MapPin size={16} className="text-primary mt-1 shrink-0" />
            <span className="line-clamp-2 leading-relaxed">{order.delivery_address}</span>
          </div>
        </div>

        <div className="border-t border-dashed pt-6 mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Order Items</p>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-lg text-[10px] font-black">
                    {item.qty}
                  </span>
                  <span className="font-bold text-foreground/90">{item.name}</span>
                </div>
                <span className="text-muted-foreground font-medium">₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <span className="text-sm font-black text-muted-foreground uppercase tracking-wider">Total</span>
          <div className="flex items-center gap-1 text-3xl font-black tracking-tighter">
            <span className="text-lg font-bold text-primary">₹</span>
            {order.grand_total}
          </div>
        </div>
        
        {order.status === 'PENDING_DELIVERY' && (
          <Button 
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
            onClick={() => setIsModalOpen(true)}
          >
            Dispatch Order
            <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </div>

      <DeliveryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderId={order.id}
        onDispatchSuccess={onStatusUpdate}
      />
    </>
  )
}
