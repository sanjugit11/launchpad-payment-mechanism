import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Dashboard from './pages/Dashboard'
import Launchpad from './pages/Launchpad'
import Rewards from './pages/Rewards'
import Convert from './pages/Convert'
import Admin from './pages/Admin'
import BuyStables from './pages/BuyStables'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-neutral-950 text-white">
        <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center font-bold text-black text-sm">SX</div>
                <span className="font-bold text-lg hidden sm:block">Launchpad</span>
              </div>
              <div className="hidden lg:flex items-center gap-1 text-sm">
                {[
                  { to: '/', label: 'Dashboard' },
                  { to: '/launchpad', label: 'Launchpad' },
                  { to: '/buy-stables', label: 'Buy Stables' },
                  { to: '/rewards', label: 'Rewards' },
                  { to: '/convert', label: 'Convert' },
                  { to: '/admin', label: 'Admin' },
                ].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-lg transition ${
                        isActive ? 'bg-amber-500/20 text-amber-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <ConnectButton />
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/launchpad" element={<Launchpad />} />
            <Route path="/buy-stables" element={<BuyStables />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/convert" element={<Convert />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
