import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Lightbulb, Copy, Check } from 'lucide-react'

const LABEL_ICONS = { bug: '🐛', security: '🔒', performance: '⚡', style: '✨', suggestion: '💡' }
const SEV_ORDER = { critical: 0, major: 1, minor: 2, info: 3 }

function CommentCard({ comment, index }) {
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  const copyFix = async () => {
    if (!comment.suggestion) return
    await navigator.clipboard.writeText(comment.suggestion)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} transition={{ delay: index * 0.04 }}
      style={{ marginBottom:8 }}>
      <div className={`label-${comment.label}`}
        style={{ borderRadius:10, overflow:'hidden', border:'inherit' }}>
        {/* Header */}
        <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
          onClick={() => setOpen(o => !o)}>
          <span style={{ fontSize:14 }}>{LABEL_ICONS[comment.label]}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, fontWeight:700 }}>{comment.title}</span>
              <span style={{ fontSize:9, fontFamily:'var(--mono)', padding:'2px 7px', borderRadius:20,
                background:'rgba(0,0,0,0.2)', fontWeight:600, letterSpacing:'0.06em' }}>
                {comment.label.toUpperCase()}
              </span>
              <span style={{ fontSize:9, fontFamily:'var(--mono)', opacity:0.7 }}>
                line {comment.line}
              </span>
            </div>
          </div>
          <span style={{ fontSize:10, opacity:0.6, marginLeft:'auto' }}>
            {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </span>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              style={{ overflow:'hidden' }}>
              <div style={{ padding:'0 14px 12px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize:13, lineHeight:1.6, marginTop:10, opacity:0.9 }}>{comment.body}</p>
                {comment.suggestion && (
                  <div style={{ marginTop:10, background:'rgba(0,0,0,0.25)', borderRadius:8,
                    padding:'10px 12px', position:'relative' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:10, opacity:0.6, fontFamily:'var(--mono)', letterSpacing:'0.06em' }}>SUGGESTED FIX</span>
                      <button onClick={copyFix} style={{ display:'flex', alignItems:'center', gap:4,
                        fontSize:10, opacity:0.7, padding:'2px 6px', borderRadius:5,
                        background:'rgba(255,255,255,0.08)', transition:'opacity 0.1s' }}>
                        {copied ? <Check size={10}/> : <Copy size={10}/>}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre style={{ fontFamily:'var(--mono)', fontSize:11, lineHeight:1.6,
                      whiteSpace:'pre-wrap', wordBreak:'break-word', opacity:0.9 }}>
                      {comment.suggestion}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}


export default function CodeViewer({ code, comments = [], language }) {
  const [activeLabel, setActiveLabel] = useState(null)
  const lines = code ? code.split('\n') : []

  // Map line → comments
  const lineMap = {}
  comments.forEach(c => {
    if (!lineMap[c.line]) lineMap[c.line] = []
    lineMap[c.line].push(c)
  })

  const filtered = activeLabel ? comments.filter(c => c.label === activeLabel) : comments
  const sorted = [...filtered].sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3))

  const labelCounts = comments.reduce((acc, c) => ({ ...acc, [c.label]: (acc[c.label] || 0) + 1 }), {})
  const labels = ['bug', 'security', 'performance', 'style', 'suggestion']

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:16, height:'100%' }}>
      {/* Code panel */}
      <div className="card" style={{ overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {/* Code header */}
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:10, background:'var(--bg3)', flexShrink:0 }}>
          <div style={{ display:'flex', gap:5 }}>
            {['#F87171','#FBBF24','#34D399'].map(c => (
              <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:0.8 }}/>
            ))}
          </div>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)' }}>
            {language || 'code'}
          </span>
          <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text3)' }}>
            {lines.length} lines · {comments.length} issue{comments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Code with line numbers */}
        <div style={{ overflow:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--mono)', fontSize:12 }}>
            <tbody>
              {lines.map((line, i) => {
                const ln = i + 1
                const lineComments = lineMap[ln] || []
                const hasIssue = lineComments.length > 0
                const worstLabel = hasIssue ? lineComments.sort((a,b) => (SEV_ORDER[a.severity]??3)-(SEV_ORDER[b.severity]??3))[0].label : null

                return (
                  <tr key={i} style={{
                    background: hasIssue ? `var(--${worstLabel}-soft)` : 'transparent',
                    borderLeft: hasIssue ? `2px solid var(--${worstLabel})` : '2px solid transparent',
                  }}>
                    <td style={{ padding:'1px 14px 1px 12px', textAlign:'right', color:'var(--text4)',
                      userSelect:'none', width:44, verticalAlign:'top', paddingTop:3, lineHeight:'20px' }}>
                      {ln}
                    </td>
                    <td style={{ padding:'1px 16px', lineHeight:'20px', whiteSpace:'pre', color:'var(--text)', verticalAlign:'top' }}>
                      {line || ' '}
                      {hasIssue && lineComments.map((c, ci) => (
                        <span key={ci} style={{ marginLeft:8, fontSize:10, padding:'1px 6px', borderRadius:10,
                          background:`var(--${c.label})`, color:'#000', fontWeight:700, opacity:0.85,
                          verticalAlign:'middle', cursor:'default' }}>
                          {LABEL_ICONS[c.label]}
                        </span>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments panel */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>
        {/* Filter pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={() => setActiveLabel(null)}
            style={{ fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:600, transition:'all 0.15s',
              background: !activeLabel ? 'var(--blue)' : 'var(--bg3)',
              color: !activeLabel ? '#fff' : 'var(--text3)',
              border: `1px solid ${!activeLabel ? 'var(--blue)' : 'var(--border)'}` }}>
            All ({comments.length})
          </button>
          {labels.filter(l => labelCounts[l]).map(l => (
            <button key={l} onClick={() => setActiveLabel(activeLabel === l ? null : l)}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:600, transition:'all 0.15s' }}
              className={activeLabel === l ? `label-${l}` : ''}
              style={{
                fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:600,
                background: activeLabel === l ? `var(--${l}-soft)` : 'var(--bg3)',
                color: activeLabel === l ? `var(--${l})` : 'var(--text3)',
                border: `1px solid ${activeLabel === l ? `var(--${l})` : 'var(--border)'}`,
                transition:'all 0.15s',
              }}>
              {LABEL_ICONS[l]} {l} ({labelCounts[l]})
            </button>
          ))}
        </div>

        {/* Comment cards */}
        <div style={{ overflow:'auto', flex:1 }}>
          {sorted.length === 0 && (
            <div style={{ textAlign:'center', padding:32, color:'var(--text3)' }}>
              <p style={{ fontSize:13 }}>No issues for this filter</p>
            </div>
          )}
          {sorted.map((c, i) => <CommentCard key={i} comment={c} index={i} />)}
        </div>
      </div>
    </div>
  )
}
