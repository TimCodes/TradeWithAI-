export function LLMArena() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">LLM Arena</h1>
      <p className="text-slate-400">Compare AI models for trading decisions</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Claude</h3>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">OpenAI</h3>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
        
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h3 className="text-lg font-semibold mb-4">Gemini</h3>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
      </div>
    </div>
  );
}