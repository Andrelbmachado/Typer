import { ArrowLeft, Bot, Compass, Layers3, PenTool, Route, Sparkles } from 'lucide-react'

export function LearnScreen({ onHome }: { onHome: () => void }) {
  return (
    <div className="learn-shell">
      <header className="learn-topbar"><div className="brand-lockup"><span className="brand-mark"><Sparkles size={18} /></span><strong>Typer</strong></div><button className="learn-back" type="button" onClick={onHome}><ArrowLeft size={16} /> Voltar à Home</button></header>
      <main className="learn-content">
        <section className="learn-hero"><span className="eyebrow">Aprender</span><h1>Construa uma fonte com intenção.</h1><p>Do primeiro ponto ao arquivo instalável: aulas curtas, práticas e alinhadas ao fluxo real do Typer.</p></section>
        <section className="learn-grid" aria-label="Guias de aprendizagem">
          <article className="learn-card"><span className="feature-icon"><PenTool size={22} /></span><span className="lesson-number">01 · Fundamentos</span><h2>Caneta: retas e curvas</h2><p>Antes das letras, treine linhas contínuas: diagonais, cantos de 90°, semicírculos, curva→reta, reta→curva e círculo com tangente.</p><ul><li>Segure Shift para travar a alça em 0°, 45° ou 90°.</li><li>Option/Alt + clique no último nó para quebrar as alças e continuar reto.</li><li>Um arco de 90° usa alça de 55,228% do raio.</li></ul></article>
          <article className="learn-card"><span className="feature-icon"><Layers3 size={22} /></span><span className="lesson-number">02 · Produção</span><h2>Fluxo tipográfico completo</h2><p>Desenhe por glifo, ajuste largura e side bearings, organize contornos e valide a família antes de exportar.</p><ul><li>Defina cap height, x-height e baseline.</li><li>Revise consistência entre letras vizinhas.</li><li>Exporte TTF apenas com contornos fechados.</li></ul></article>
          <article className="learn-card"><span className="feature-icon"><Bot size={22} /></span><span className="lesson-number">03 · Automação</span><h2>Pronto para IA</h2><p>O servidor MCP local cria e atualiza `.typer.json`. Importe o projeto, reveja os vetores e use o editor para acabamento humano.</p><ul><li>Consulte um preset vetorial.</li><li>Insira glifos em lote.</li><li>Valide e exporte pelo MCP.</li></ul></article>
        </section>
        <section className="learn-flow"><Route size={19} /><div><strong>Fluxo recomendado</strong><span>preset → glifos → revisão no canvas → validação → TTF</span></div><Compass size={19} /></section>
      </main>
    </div>
  )
}
