'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Truck, ExternalLink, CheckCircle2, Navigation } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DeliveryModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  onDispatchSuccess: () => void
}

export function DeliveryModal({ isOpen, onClose, orderId, onDispatchSuccess }: DeliveryModalProps) {
  const [partner, setPartner] = useState('Uber')
  const [trackingLink, setTrackingLink] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDispatch = async () => {
    setLoading(true)
    try {
      // 1. Update Supabase status
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ASSIGNED' })
        .eq('id', orderId)

      if (error) throw error
      
      // 2. Trigger Backend Notification
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const finalTracking = trackingLink || 'https://track.uber.com/demo'
      
      await fetch(`${backendUrl}/notify-dispatch?order_id=${orderId}&partner=${partner}&tracking_link=${encodeURIComponent(finalTracking)}`, {
        method: 'POST',
      })
      
      onDispatchSuccess()
      onClose()
    } catch (error) {
      console.error('Error dispatching:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none glass p-8">
        <DialogHeader className="mb-8">
          <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center text-primary mb-6 mx-auto glow-primary">
            <Truck size={32} />
          </div>
          <DialogTitle className="text-3xl font-black text-center tracking-tight">Dispatch Order</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-lg mt-2">
            Choose your partner and send tracking details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-2">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Delivery Partner</Label>
            <RadioGroup 
              value={partner} 
              onValueChange={setPartner} 
              className="grid grid-cols-2 gap-4"
            >
              <PartnerOption id="Uber" label="Uber Direct" value="Uber" active={partner === 'Uber'} icon={Truck} />
              <PartnerOption id="Rapido" label="Rapido Bike" value="Rapido" active={partner === 'Rapido'} icon={Navigation} />
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Live Tracking Link</Label>
            <div className="relative group">
              <ExternalLink size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="https://track.uber.com/..."
                value={trackingLink}
                onChange={(e) => setTrackingLink(e.target.value)}
                className="h-14 pl-12 rounded-2xl border bg-background/50 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-10">
          <Button 
            className="w-full h-16 rounded-3xl bg-primary text-primary-foreground font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={handleDispatch}
            disabled={loading}
          >
            {loading ? 'Dispatching...' : 'Confirm Dispatch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PartnerOption({ id, label, value, active, icon: Icon }: any) {
  return (
    <div className="relative">
      <RadioGroupItem value={value} id={id} className="peer sr-only" />
      <Label
        htmlFor={id}
        className={`flex flex-col items-center justify-center p-6 h-32 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${
          active 
            ? 'border-primary bg-primary/5 text-primary scale-100 shadow-xl shadow-primary/5' 
            : 'border-muted bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5'
        }`}
      >
        <Icon size={24} className={`mb-2 transition-transform ${active ? 'scale-110' : 'grayscale'}`} />
        <span className="font-bold tracking-tight text-[13px]">{label}</span>
        {active && <CheckCircle2 size={16} className="absolute top-4 right-4 animate-in zoom-in" />}
      </Label>
    </div>
  )
}
