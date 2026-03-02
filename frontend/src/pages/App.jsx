import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Github, Zap, History, Trash2, Eye, EyeOff,
  Settings, X, Save, BookMarked, AlertCircle, CheckCircle,
  ChevronRight, Sparkles, Shield, Gauge, Paintbrush, Lightbulb, Bug
} from 'lucide-react'
import { useStore } from '../store'
import CodeViewer from '../components/ui/CodeViewer'
import { formatDistanceToNow } from 'date-fns'

const LABEL_META = {
  bug:         { icon: Bug,        color: 'var(--bug)',         label: 'Bug' },
  security:    { icon: Shield,     color: 'var(--security)',    label: 'Security' },
  performance: { icon: Gauge,      color: 'var(--performance)', label: 'Performance' },
  style:       { icon: Paintbrush, color: 'var(--style)',       label: 'Style' },
  suggestion:  { icon: Lightbulb,  color: 'var(--suggestion)',  label: 'Suggestion' },
}

const SAMPLE_CODE = `import hashlib
import sqlite3

def authenticate(username, password):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # Check if user exists
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    user = cursor.fetchone()
    
    if user:
        stored_password = user[2]
        if password == stored_password:
            return True
    return False

def get_user_data(user_id):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
    return cursor.fetchall()

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
`

export default function App() {
  const {
    groqApiKey, setGroqApiKey, currentReview, setCurrentReview,
    loading, error, reviewPaste, reviewPR, saveCurrentReview,
    history, fetchHistory, deleteReview, loadReview,
  } = useStore()

  const [tab, setTab] = useState('paste')       // paste | pr
  const [code, setCode] = useState('')
  const [filename, setFilename] = useState('')
  const [prUrl, setPrUrl] = useState('')
  const [saveOnReview, setSaveOnReview] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { fetchHistory() }, [])

  const handleReview = async () => {
    if (tab === 'paste') {
      if (!code.trim()) return
      await reviewPaste({ code, filename: filename || undefined, save: saveOnReview, title: filename || 'Pasted Code' })
    } else {
      if (!prUrl.trim()) return
      await reviewPR({ pr_url: prUrl, save: saveOnReview })
    }
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await saveCurrentReview()
    setSaving(false); setSaved(true)
  }

  const hasKey = !!groqApiKey
  const review = currentReview

  const statItems = review?.stats ? Object.entries(review.stats).filter(([,v]) => v > 0) : []

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column',
        background:'var(--bg2)', borderRight:'1px solid var(--border)' }}>
        {/* Logo */}
        <div style={{ padding:'18px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ width:32, height:32, borderRadius:9,
              background:'linear-gradient(135deg, #3B82F6, #22D3EE)',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 14px rgba(59,130,246,0.3)' }}>
              <Code2 size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:14, letterSpacing:'-0.02em' }}>CodeReview AI</p>
              <p style={{ fontSize:10, color:'var(--text3)' }}>Powered by Groq</p>
            </div>
          </div>

          {/* API key status */}
          <button onClick={() => setShowSettings(s => !s)}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:7, padding:'7px 10px',
              borderRadius:8, fontSize:12, transition:'all 0.15s',
              background: hasKey ? 'rgba(34,211,238,0.07)' : 'var(--bg4)',
              border:`1px solid ${hasKey ? 'rgba(34,211,238,0.2)' : 'var(--border)'}`,
              color: hasKey ? 'var(--cyan)' : 'var(--text3)' }}>
            <Settings size={12}/>
            {hasKey ? '✓ Groq key set' : 'Set API key'}
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                style={{ overflow:'hidden', marginTop:8 }}>
                <div style={{ position:'relative' }}>
                  <input className="input" type={keyVisible ? 'text' : 'password'}
                    placeholder="gsk_..." value={keyDraft || groqApiKey}
                    onChange={e => setKeyDraft(e.target.value)}
                    style={{ fontSize:11, paddingRight:56 }} />
                  <div style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', display:'flex', gap:3 }}>
                    <button onClick={() => setKeyVisible(v=>!v)} style={{ color:'var(--text3)', padding:3 }}>
                      {keyVisible ? <EyeOff size={11}/> : <Eye size={11}/>}
                    </button>
                    <button onClick={() => { setGroqApiKey(keyDraft || groqApiKey); setKeyDraft(''); setShowSettings(false) }}
                      style={{ color:'var(--cyan)', padding:3, fontSize:11, fontWeight:700 }}>✓</button>
                  </div>
                </div>
                <p style={{ fontSize:10, color:'var(--text3)', marginTop:5, lineHeight:1.5 }}>
                  Free at <a href="https://console.groq.com" target="_blank" style={{ color:'var(--blue)' }}>console.groq.com</a>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History toggle */}
        <button onClick={() => setShowHistory(s => !s)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px',
            borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text2)',
            background: showHistory ? 'var(--bg3)' : 'transparent', transition:'all 0.15s' }}>
          <History size={14}/>
          Saved Reviews
          <span style={{ marginLeft:'auto', fontSize:11, background:'var(--bg4)',
            padding:'2px 7px', borderRadius:10, color:'var(--text3)' }}>{history.length}</span>
        </button>

        {/* History list */}
        <div style={{ flex:1, overflow:'auto', padding:'6px 8px' }}>
          {showHistory ? (
            history.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 12px', color:'var(--text4)' }}>
                <BookMarked size={20} style={{ margin:'0 auto 8px', opacity:0.3 }}/>
                <p style={{ fontSize:12 }}>No saved reviews yet</p>
              </div>
            ) : history.map(r => (
              <div key={r.id}
                onClick={() => loadReview(r)}
                style={{ padding:'9px 10px', borderRadius:8, marginBottom:3, cursor:'pointer',
                  transition:'all 0.12s', border:'1px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.borderColor='var(--border)' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6 }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <p style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</p>
                    <p style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>
                      {r.comments?.length || 0} issues · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteReview(r.id) }}
                    style={{ color:'var(--text4)', padding:3, flexShrink:0, transition:'color 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.color='var(--bug)'}
                    onMouseLeave={e => e.currentTarget.style.color='var(--text4)'}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding:'16px 8px' }}>
              <p style={{ fontSize:11, color:'var(--text4)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600 }}>What we check</p>
              {Object.entries(LABEL_META).map(([key, meta]) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:7, marginBottom:3 }}>
                  <meta.icon size={12} style={{ color: meta.color, flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:'var(--text2)' }}>{meta.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg2)',
          display:'flex', alignItems:'center', gap:16, flexShrink:0 }}>
          {/* Input tabs */}
          <div style={{ display:'flex', gap:3, background:'var(--bg3)', borderRadius:9, padding:3,
            border:'1px solid var(--border)' }}>
            {[
              { id:'paste', icon:Code2, label:'Paste Code' },
              { id:'pr', icon:Github, label:'GitHub PR' },
            ].map(({ id, icon:Icon, label }) => (
              <button key={id} onClick={() => { setTab(id); setCurrentReview(null) }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:7,
                  fontSize:12, fontWeight:600, transition:'all 0.15s',
                  background: tab === id ? 'var(--bg5)' : 'transparent',
                  color: tab === id ? 'var(--electric)' : 'var(--text3)',
                  border: `1px solid ${tab === id ? 'var(--border2)' : 'transparent'}` }}>
                <Icon size={13}/> {label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div style={{ flex:1, display:'flex', gap:10, alignItems:'center' }}>
            {tab === 'paste' ? (
              <input className="input" value={filename} onChange={e => setFilename(e.target.value)}
                placeholder="filename.py (optional)"
                style={{ maxWidth:200, fontSize:12, padding:'7px 11px' }} />
            ) : (
              <input className="input" value={prUrl} onChange={e => setPrUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                style={{ flex:1, fontSize:12, padding:'7px 11px' }}
                onKeyDown={e => e.key === 'Enter' && handleReview()} />
            )}
          </div>

          {/* Save toggle */}
          <button onClick={() => setSaveOnReview(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8,
              fontSize:12, transition:'all 0.15s',
              background: saveOnReview ? 'rgba(34,211,238,0.08)' : 'transparent',
              border: `1px solid ${saveOnReview ? 'rgba(34,211,238,0.25)' : 'var(--border)'}`,
              color: saveOnReview ? 'var(--cyan)' : 'var(--text3)' }}>
            <Save size={12}/> {saveOnReview ? 'Auto-save on' : 'Auto-save off'}
          </button>

          <button onClick={handleReview} disabled={loading || (!code.trim() && tab === 'paste') || (!prUrl.trim() && tab === 'pr')}
            className="btn-primary"
            style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 18px', fontSize:13, flexShrink:0 }}>
            {loading
              ? <><div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/> Analyzing…</>
              : <><Zap size={13}/> Review</>
            }
          </button>
        </div>

        {/* Error bar */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              style={{ background:'rgba(248,113,113,0.08)', borderBottom:'1px solid rgba(248,113,113,0.2)',
                padding:'10px 24px', display:'flex', alignItems:'center', gap:8 }}>
              <AlertCircle size={14} style={{ color:'var(--bug)', flexShrink:0 }}/>
              <p style={{ fontSize:13, color:'var(--bug)' }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {!review ? (
            /* Input view */
            <div style={{ flex:1, padding:'20px 24px', overflow:'auto' }}>
              {tab === 'paste' ? (
                <div style={{ height:'100%', display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontSize:12, color:'var(--text3)' }}>Paste your code below</p>
                    <button onClick={() => setCode(SAMPLE_CODE)}
                      style={{ fontSize:11, color:'var(--blue)', padding:'4px 10px', borderRadius:7,
                        background:'var(--blue-soft)', border:'1px solid rgba(59,130,246,0.2)',
                        transition:'opacity 0.1s' }}>
                      Load sample (Python auth code with bugs)
                    </button>
                  </div>
                  <textarea value={code} onChange={e => setCode(e.target.value)}
                    placeholder="Paste your code here…"
                    style={{ flex:1, background:'var(--bg2)', border:'1.5px solid var(--border)',
                      borderRadius:12, padding:'16px', fontFamily:'var(--mono)', fontSize:12,
                      color:'var(--text)', lineHeight:1.7, resize:'none',
                      transition:'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor='var(--blue)'}
                    onBlur={e => e.target.style.borderColor='var(--border)'} />
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  height:'100%', gap:20 }}>
                  <div style={{ width:56, height:56, borderRadius:16,
                    background:'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(34,211,238,0.1))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    border:'1px solid rgba(59,130,246,0.2)', boxShadow:'0 4px 24px rgba(59,130,246,0.1)' }}>
                    <Github size={24} style={{ color:'var(--electric)' }}/>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Review a GitHub PR</h2>
                    <p style={{ color:'var(--text3)', fontSize:13, maxWidth:360, lineHeight:1.6 }}>
                      Paste a GitHub pull request URL above and click Review. We'll fetch the diff and analyze all changed files.
                    </p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, maxWidth:400, width:'100%' }}>
                    {['Public repositories only (no auth needed)', 'Analyzes all changed files in the PR', 'Focuses on added lines (+) in the diff'].map(t => (
                      <div key={t} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
                        borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                        <CheckCircle size={13} style={{ color:'var(--style)', flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:'var(--text2)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Review view */
            <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              {/* Review header bar */}
              <div style={{ padding:'12px 24px', borderBottom:'1px solid var(--border)',
                background:'var(--bg3)', display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {review.title}
                  </p>
                  {review.summary && (
                    <p style={{ fontSize:12, color:'var(--text2)', marginTop:2, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:600 }}>
                      {review.summary}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display:'flex', gap:8 }}>
                  {statItems.map(([label, count]) => (
                    <div key={label} className={`label-${label}`}
                      style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:700 }}>
                      {count} {label}
                    </div>
                  ))}
                </div>

                {/* Save button */}
                {!review.id && (
                  <button onClick={handleSave} disabled={saving || saved}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
                      borderRadius:8, fontSize:12, fontWeight:600, transition:'all 0.15s', flexShrink:0,
                      background: saved ? 'rgba(34,211,238,0.08)' : 'var(--bg4)',
                      border: `1px solid ${saved ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                      color: saved ? 'var(--cyan)' : 'var(--text2)' }}>
                    {saved ? <><CheckCircle size={12}/> Saved!</> : saving ? 'Saving…' : <><Save size={12}/> Save Review</>}
                  </button>
                )}
                {review.id && (
                  <span style={{ fontSize:11, color:'var(--style)', display:'flex', alignItems:'center', gap:5 }}>
                    <CheckCircle size={12}/> Saved
                  </span>
                )}

                <button onClick={() => setCurrentReview(null)}
                  style={{ color:'var(--text3)', padding:6, borderRadius:7, transition:'color 0.1s', flexShrink:0 }}
                  onMouseEnter={e => e.currentTarget.style.color='var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--text3)'}>
                  <X size={15}/>
                </button>
              </div>

              {/* Code + comments */}
              <div style={{ flex:1, overflow:'hidden', padding:'16px 24px' }}>
                <CodeViewer
                  code={review.code_snippet || ''}
                  comments={review.comments || []}
                  language={review.language}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
