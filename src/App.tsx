import UpdateElectron from '@/components/update'
import MonitorChart from '@/components/MonitorChart'
import './App.css'

function App() {
  return (
    <div className='App'>
      <div className="min-h-screen bg-gray-50">
        <MonitorChart />
      </div>
      <UpdateElectron />
    </div>
  )
}

export default App