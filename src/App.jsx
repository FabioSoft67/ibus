import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import NewTicket from './screens/NewTicket.jsx'
import TicketList from './screens/TicketList.jsx'
import TicketDetail from './screens/TicketDetail.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <div className="header-inner">
          <span className="logo">iBus Ticketsystem</span>
          <nav>
            <NavLink to="/" end>Neues Ticket</NavLink>
            <NavLink to="/tickets">Ticket-Liste</NavLink>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<NewTicket />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
