export function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              TradeWithAI
            </h1>
            <nav className="flex space-x-6">
              <a href="/" className="text-slate-300 hover:text-white transition-colors">
                Dashboard
              </a>
              <a href="/arena" className="text-slate-300 hover:text-white transition-colors">
                LLM Arena
              </a>
              <a href="/portfolio" className="text-slate-300 hover:text-white transition-colors">
                Portfolio
              </a>
              <a href="/settings" className="text-slate-300 hover:text-white transition-colors">
                Settings
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">Balance: $10,000.00</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </header>
  );
}