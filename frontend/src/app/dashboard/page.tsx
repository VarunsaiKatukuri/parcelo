'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Order } from '@/types'
import { 
  Package, RefreshCcw, LayoutDashboard, Search, 
  BarChart3, Settings, LogOut, ShoppingBag,
  Bell, ChevronDown, User, CheckCircle2,
  MapPin, Truck, Navigation, Wallet, ClipboardList, 
  Clock, Tag, CreditCard, MessageCircle, MoreVertical,
  Store, Smartphone, Users, TrendingUp, Bike, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  const stats = [
    { 
      label: "Today's Revenue", 
      value: `₹${orders.filter(o => o.status !== 'PENDING_PAYMENT').reduce((acc, o) => acc + o.grand_total, 0).toLocaleString()}`, 
      trend: "Real-time", 
      trendUp: true, 
      icon: Wallet, 
      color: "text-blue-700", 
      bg: "bg-blue-100/50" 
    },
    { 
      label: "Active Orders", 
      value: orders.filter(o => o.status === 'PENDING_DELIVERY' || o.status === 'READY').length.toString(), 
      trend: "Preparing & ready", 
      icon: ShoppingBag, 
      color: "text-orange-600", 
      bg: "bg-orange-100/50" 
    },
    { 
      label: "Orders Completed Today", 
      value: orders.filter(o => o.status === 'DELIVERED' || o.status === 'ASSIGNED').length.toString(), 
      trend: "Today", 
      icon: ClipboardList, 
      color: "text-blue-600", 
      bg: "bg-blue-100/50" 
    },
    { 
      label: "Avg. Delivery Time", 
      value: "14 min", 
      trend: "Live tracking", 
      trendUp: false, 
      icon: Clock, 
      color: "text-orange-500", 
      bg: "bg-orange-100/50" 
    },
  ]

  const columns = [
    { id: 'PENDING_PAYMENT', title: 'New Orders', icon: ShoppingBag, color: 'text-blue-700' },
    { id: 'PENDING_DELIVERY', title: 'Preparing', icon: ShoppingBag, color: 'text-orange-600' },
    { id: 'READY', title: 'Ready for Dispatch', icon: CheckCircle2, color: 'text-blue-600' },
    { id: 'ASSIGNED', title: 'Dispatched', icon: Bike, color: 'text-emerald-600' },
  ]

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) fetchOrders()
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r flex flex-col sticky top-0 h-screen z-50">
        <div className="p-8 flex items-center gap-3">
             <img src="/logo.png" alt="Parcelo Logo" className="w-48 h-auto object-contain" />
        </div>

        <nav className="flex-1 px-6 space-y-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
          <SidebarItem icon={Package} label="Orders" count={orders.filter(o => o.status === 'PENDING_PAYMENT' || o.status === 'PENDING_DELIVERY' || o.status === 'READY').length} />
          <SidebarItem icon={BarChart3} label="Menu Management" />
          <SidebarItem icon={Users} label="Customers" />
          <SidebarItem icon={CreditCard} label="Payments" />
          <SidebarItem icon={Truck} label="Delivery Partners" />
          <SidebarItem icon={TrendingUp} label="Analytics" />
          <SidebarItem icon={Tag} label="Discounts" />
          <SidebarItem icon={Settings} label="Settings" />
        </nav>

        <div className="p-8 mt-auto space-y-6">
          <div className="bg-[#EFF6FF] p-6 rounded-[2rem] relative overflow-hidden group border border-blue-100/50 cursor-pointer">
             <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                   <MessageCircle size={20} className="text-[#2563EB]" />
                </div>
                <p className="text-sm font-black text-[#2563EB]">Need Help?</p>
                <p className="text-xs text-blue-500 font-bold mt-1">Chat with us</p>
             </div>
          </div>
          
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between px-2">
                <button className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm">
                  <LogOut size={18} />
                  Logout
                </button>
             </div>
             {/* Mascot Area */}
             <div className="flex justify-center py-4">
                <div className="w-36 h-36 relative flex items-center justify-center animate-bounce duration-[2000ms]">
                   <img src="/mascot.png" alt="Parcelo Mascot" className="w-32 h-32 object-contain drop-shadow-xl" />
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="px-10 py-8 flex justify-between items-center bg-white/50 backdrop-blur-sm border-b sticky top-0 z-40">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-[#0F172A]">Good evening, Varun! 👋</h1>
            <p className="text-slate-400 font-bold text-lg mt-0.5">Here's what's happening with your business today.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-100 parcelo-shadow cursor-pointer hover:bg-slate-50 transition-all">
                   <div className="bg-slate-50 p-2 rounded-xl">
                     <Store size={20} className="text-[#2563EB]" />
                   </div>
                   <span className="text-base font-black text-slate-800 tracking-tight">HiTech Cafe</span>
                   <ChevronDown size={16} className="text-slate-400" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl w-48 p-2">
                <DropdownMenuItem className="rounded-xl font-bold p-3">HiTech Cafe</DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl font-bold p-3">Gachibowli Outlet</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center relative border border-slate-100 cursor-pointer group">
                <Bell size={24} className="text-slate-400 group-hover:text-[#2563EB] transition-colors" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-700 rounded-full border-4 border-[#F8FAFC] flex items-center justify-center">
                  <span className="text-[10px] text-white font-black">3</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#2563EB] pl-2 pr-5 py-2 rounded-2xl text-white shadow-xl shadow-blue-900/20 cursor-pointer">
                 <div className="bg-blue-400/20 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border border-white/20">V</div>
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-black tracking-tight">Varun</span>
                   <ChevronDown size={14} className="text-blue-200" />
                 </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-auto p-10 space-y-10">
            {/* STATS */}
          <div className="grid grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100/50 shadow-sm group hover:border-[#2563EB]/20 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className={`${stat.bg} ${stat.color} p-4 rounded-3xl transition-transform group-hover:scale-110`}>
                    <stat.icon size={28} />
                  </div>
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                <h3 className="text-4xl font-black mt-2 mb-3 tracking-tighter text-slate-900">{stat.value}</h3>
                <div className="flex items-center gap-2">
                  {stat.trend.includes('%') ? (
                    <span className={`text-xs font-black ${stat.trendUp ? 'text-emerald-500' : 'text-rose-500'} flex items-center gap-1.5`}>
                      {stat.trendUp ? '↑' : '↓'} {stat.trend} <span className="text-slate-400 font-bold">vs yesterday</span>
                    </span>
                  ) : (
                    <span className="text-xs font-black text-slate-500 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {stat.trend}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* KANBAN BOARD */}
          <div className="grid grid-cols-4 gap-8 items-start">
            {columns.map((col) => (
              <div key={col.id} className="flex flex-col gap-6">
                <div className="flex justify-between items-center px-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${col.color.replace('text', 'bg')}/10 ${col.color}`}>
                      <col.icon size={20} />
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-[0.1em] text-slate-800">{col.title}</h4>
                  </div>
                  <div className="bg-white border shadow-sm text-xs font-black rounded-full w-7 h-7 flex items-center justify-center text-slate-600">
                    {orders.filter(o => o.status === col.id).length}
                  </div>
                </div>
                
                <div className="flex flex-col gap-5 min-h-[500px] rounded-[3rem] bg-slate-100/30 p-4 border border-dashed border-slate-200">
                  {orders.filter(o => o.status === col.id).map((order) => (
                    <div 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="bg-white p-6 rounded-[2.5rem] border border-white hover:border-[#D97706] cursor-pointer transition-all hover:scale-[1.02] parcelo-card-shadow group"
                    >
                      <div className="flex justify-between items-start mb-4">
                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{order.id.slice(0, 4)}</span>
                         <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                           5 mins ago
                         </span>
                      </div>
                      
                      <h5 className="font-black text-xl mb-1 text-[#0F172A] group-hover:text-[#2563EB] transition-colors">{order.customer_name}</h5>
                      <p className="text-[11px] font-bold text-slate-400 mb-5">{order.customer_phone}</p>
                      
                      <div className="space-y-2 mb-6">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                             <p className="text-xs text-slate-600 font-black">{item.qty} x {item.name}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-1">
                             <span className={`text-[10px] font-black uppercase tracking-widest ${order.status === 'PENDING_PAYMENT' ? 'text-orange-500' : 'text-emerald-500'}`}>
                               ● {order.status === 'PENDING_PAYMENT' ? 'Payment Pending' : 'Paid'}
                             </span>
                          </div>
                          <span className="text-2xl font-black tracking-tighter text-[#0F172A]">₹{order.grand_total}</span>
                        </div>
                        
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (order.status === 'PENDING_PAYMENT') handleStatusUpdate(order.id, 'PENDING_DELIVERY');
                            else if (order.status === 'PENDING_DELIVERY') handleStatusUpdate(order.id, 'READY');
                            else setSelectedOrder(order);
                          }}
                          className={`rounded-2xl font-black text-[11px] h-10 px-6 tracking-wide transition-all ${
                            order.status === 'PENDING_PAYMENT' ? 'btn-accept' : 
                            order.status === 'PENDING_DELIVERY' ? 'btn-ready' : 
                            order.status === 'READY' ? 'btn-dispatch' : 'btn-view'
                          }`}
                        >
                          {order.status === 'PENDING_PAYMENT' ? 'Accept' : 
                           order.status === 'PENDING_DELIVERY' ? 'Mark Ready' : 
                           order.status === 'READY' ? 'Dispatch' : 'View Details'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DETAIL SIDE PANEL */}
        {selectedOrder && (
          <aside className="w-[450px] shrink-0 border-l border-slate-100 bg-white h-full shadow-2xl z-40 animate-in slide-in-from-right duration-300">
            <div className="h-full flex flex-col bg-white">
              <div className="p-10 border-b border-slate-50 relative">
                <button onClick={() => setSelectedOrder(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors">
                   <X size={24} />
                </button>
                <div className="space-y-4">
                   <Badge className="bg-blue-50 text-blue-700 border-blue-100 rounded-full font-black text-[10px] px-3 py-1 uppercase">
                     {selectedOrder.status.replace('_', ' ')}
                   </Badge>
                   <h2 className="text-4xl font-black tracking-tight text-[#2563EB]">Order #{selectedOrder.id.slice(0, 4)}</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12">
                {/* Customer */}
                <section>
                   <div className="flex items-center gap-5 mb-6">
                      <div className="w-16 h-16 bg-[#D97706]/10 rounded-3xl flex items-center justify-center text-[#D97706]">
                        <User size={32} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-2xl font-black text-[#0F172A]">{selectedOrder.customer_name}</h4>
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-sm mt-1">
                          <span>{selectedOrder.customer_phone}</span>
                          <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                             <CheckCircle2 size={12} />
                          </div>
                        </div>
                      </div>
                      <button className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                        <MessageCircle size={20} />
                      </button>
                   </div>
                   <div className="flex items-start gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <MapPin size={20} className="text-[#D97706] shrink-0" />
                      <p className="text-sm font-bold text-slate-500 leading-relaxed">Hitech City, Hyderabad, Telangana</p>
                   </div>
                </section>

                {/* Items */}
                <section>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Order Items</p>
                   <div className="space-y-5">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                           <p className="font-bold text-slate-800">{item.qty} x {item.name}</p>
                           <p className="font-black text-slate-900">₹{item.price * item.qty}</p>
                        </div>
                      ))}
                      <div className="pt-6 border-t flex justify-between items-center">
                         <span className="text-xl font-black text-slate-900">Total</span>
                         <span className="text-3xl font-black text-[#2563EB]">₹{selectedOrder.grand_total}</span>
                      </div>
                   </div>
                </section>

                {/* Payment */}
                <section>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Payment</p>
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500" />
                         <span className="text-sm font-bold text-slate-800">Online (UPI)</span>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[10px] font-black">Paid</Badge>
                   </div>
                </section>

                {/* Delivery Options */}
                <section>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                     {selectedOrder.status === 'ASSIGNED' ? 'Delivery Information' : 'Dispatch via Partner'}
                   </p>
                   {selectedOrder.status === 'ASSIGNED' ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-8 flex flex-col items-center text-center">
                         <div className="bg-emerald-500 text-white p-4 rounded-3xl mb-4 shadow-lg shadow-emerald-500/20">
                            <Truck size={32} />
                         </div>
                         <h4 className="text-xl font-black text-emerald-900">Order Dispatched</h4>
                         <p className="text-sm font-bold text-emerald-600/80 mt-1 mb-6">Your order is on its way to the customer.</p>
                         <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-8 font-black text-sm">
                            Track Live Status
                         </Button>
                      </div>
                   ) : (
                      <div className="space-y-4">
                        <DeliveryOptionCard 
                          name="Rapido" 
                          eta="5 min" 
                          price="58" 
                          color="#D97706" 
                          iconImg="/rapido.png"
                          onDispatch={() => handleDispatch(selectedOrder.id, 'Rapido')}
                        />
                        <DeliveryOptionCard 
                          name="Uber Direct" 
                          eta="7 min" 
                          price="65" 
                          color="#2563EB" 
                          iconImg="/uber.png"
                          onDispatch={() => handleDispatch(selectedOrder.id, 'Uber')}
                        />
                      </div>
                   )}
                </section>

                {/* Timeline */}
                <section>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Order Timeline</p>
                   <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      <TimelinePoint label="Order Received" time="25 mins ago" active />
                      <TimelinePoint label="Payment Received" time="24 mins ago" active />
                      <TimelinePoint label="Marked Ready" time="5 mins ago" active />
                   </div>
                </section>
              </div>
            </div>
          </aside>
        )}
        </div>
      </main>
    </div>
  )
}

function SidebarItem({ icon: Icon, label, active, count, href = '#' }: any) {
  return (
    <Link href={href} className={`flex items-center justify-between px-5 py-4 rounded-[1.5rem] cursor-pointer transition-all group ${
      active 
        ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-900/20 font-black' 
        : 'text-slate-400 hover:bg-slate-50 hover:text-[#2563EB]'
    }`}>
      <div className="flex items-center gap-4">
        <Icon size={22} className={active ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
        <span className="text-[15px] tracking-tight">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${
          active ? 'bg-blue-400 text-white' : 'bg-[#2563EB] text-white shadow-lg shadow-blue-900/20'
        }`}>
          {count}
        </span>
      )}
    </Link>
  )
}

function DeliveryOptionCard({ name, eta, price, color, iconImg, onDispatch }: any) {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm group hover:border-[#D97706] transition-all">
       <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
             <div className="bg-slate-50 p-3 rounded-2xl group-hover:scale-110 transition-all flex items-center justify-center w-14 h-14">
               <img src={iconImg} alt={name} className="w-10 h-10 object-contain mix-blend-multiply" />
             </div>
             <div>
               <p className="font-black text-lg text-[#0F172A]">{name}</p>
               <p className="text-xs text-slate-400 font-bold">ETA: {eta}</p>
             </div>
          </div>
          <p className="font-black text-2xl tracking-tighter text-[#0F172A]">₹{price}</p>
       </div>
       <Button 
         className="w-full h-14 rounded-2xl font-black text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
         style={{ backgroundColor: color }}
         onClick={onDispatch}
       >
         Dispatch via {name}
       </Button>
    </div>
  )
}

function TimelinePoint({ label, time, active }: any) {
  return (
    <div className="flex items-center gap-5 relative z-10">
       <div className={`w-4 h-4 rounded-full border-4 border-white ${active ? 'bg-[#2563EB] shadow-[0_0_15px_rgba(30,58,138,0.3)]' : 'bg-slate-200'}`} />
       <div className="flex justify-between flex-1 items-center">
          <p className={`text-sm font-black ${active ? 'text-[#0F172A]' : 'text-slate-300'}`}>{label}</p>
          <p className="text-[10px] font-black text-slate-400">{time}</p>
       </div>
    </div>
  )
}
