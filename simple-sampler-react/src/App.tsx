import { useState } from 'react'
import './App.css'
import SepaBuilder from './paymentBuilder/sepa_builder.ts'
import PaymentGenerator from './paymentGenerator/generator.tsx'

function App() {
  const [activeView, setActiveView] = useState<'builder' | 'generator'>('builder')

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebarInner">
          <p className="builder-kicker">Simple Sampler</p>
          <h2 className="app-sidebarTitle">Payments</h2>
          <div className="app-nav">
            <button
              className={`app-navButton ${activeView === 'builder' ? 'app-navButtonActive' : ''}`}
              onClick={() => setActiveView('builder')}
              type="button"
            >
              Builder
            </button>
            <button
              className={`app-navButton ${activeView === 'generator' ? 'app-navButtonActive' : ''}`}
              onClick={() => setActiveView('generator')}
              type="button"
            >
              Generator
            </button>
          </div>
        </div>
      </aside>
      <main className="app-content">
        <section className={activeView === 'builder' ? 'app-view app-viewActive' : 'app-view'}>
          <SepaBuilder />
        </section>
        <section className={activeView === 'generator' ? 'app-view app-viewActive' : 'app-view'}>
          <PaymentGenerator />
        </section>
      </main>
    </div>
  )
}

export default App
