import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>Rankito - Sistema de Ranking</h1>
        <p>Aplicação está funcionando!</p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            Contador: {count}
          </button>
        </div>
        <p className="read-the-docs">
          Deploy manual realizado com sucesso
        </p>
      </header>
    </div>
  )
}

export default App
