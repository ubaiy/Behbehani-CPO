// wf-base.jsx — shared wireframe primitives for the Behbehani Motors sketches.
// Every wireframe screen below composes these. Royal-blue accent is provided
// via CSS vars on body so tweaks can toggle the accent on/off globally.

const ink = 'var(--ink)';
const muted = 'var(--muted)';
const royal = 'var(--royal)';
const paper = 'var(--paper)';

// ─── A photo placeholder. variant 'car' draws a tiny car silhouette inside.
function Img({h='100%', w='100%', variant='', label, style, children}){
  return (
    <div className={`wf-img ${variant}`} style={{width:w, height:h, ...style}}>
      {label && <span style={{fontFamily:'Caveat,cursive', color:'#7a766c', fontSize:13}}>{label}</span>}
      {children}
    </div>
  );
}

// ─── A box. props pass-through; `as` defaults div.
function Box({children, h, w, p, pad, accent, fill, dashed, thin, thick, rough=true, className='', style, ...rest}){
  const cls = [
    'wf-box',
    thin && 'thin', thick && 'thick', dashed && 'dashed',
    accent==='blue' && 'accent', accent==='blue-2' && 'accent-2',
    fill==='ink' && 'fill-ink', fill==='royal' && 'fill-royal',
    fill==='pale' && 'fill-pale', fill==='paper-2' && 'fill-paper-2',
    rough && 'rough',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div className={cls}
      style={{width:w, height:h, padding:pad ?? p, ...style}}
      {...rest}>
      {children}
    </div>
  );
}

// ─── Multi-line text lines (lorem replacement)
function Lines({n=3, widths, gap=6, thick=false, style}){
  const ws = widths || Array.from({length:n}, (_,i)=> ['full','long','mid','long','full','mid','short'][i%7]);
  return (
    <div style={{display:'flex', flexDirection:'column', gap, ...style}}>
      {ws.map((w,i)=> <span key={i} className={`wf-line ${w} ${thick?'thick':''}`}/>)}
    </div>
  );
}

// ─── Hand-written text
function H({children, size=14, weight=400, color='var(--ink)', italic=false, family='kalam', style}){
  const fam = family==='caveat' ? '"Caveat",cursive'
            : family==='arch'   ? '"Architects Daughter",cursive'
            : family==='ui'     ? '"Inter",system-ui,sans-serif'
            : '"Kalam",cursive';
  return <span style={{fontFamily:fam, fontSize:size, fontWeight:weight, color,
    fontStyle:italic?'italic':'normal', display:'inline-block', lineHeight:1.25, ...style}}>{children}</span>;
}

// ─── A button (sketchy)
function Btn({children, primary, ghost, big, icon, color, style, ...rest}){
  const cls = ['wf-btn', primary && 'primary', ghost && 'ghost', big && 'big', icon && 'icon'].filter(Boolean).join(' ');
  const extra = color ? {borderColor:color, background:primary?color:'transparent', color:primary?'#fff':color} : {};
  return <span className={cls} style={{...extra, ...style}} {...rest}>{children}</span>;
}

// ─── A chip / filter pill
function Chip({children, accent, fill, style, ...rest}){
  const cls = ['wf-chip', accent && 'accent', fill && 'fill'].filter(Boolean).join(' ');
  return <span className={cls} style={style} {...rest}>{children}</span>;
}

// ─── Sticker badge (think: tape-on price drop)
function Badge({children, royal:isRoyal, style}){
  return <span className={`wf-badge ${isRoyal?'royal':''}`} style={style}>{children}</span>;
}

// ─── An annotation arrow + label. dir = where the arrow points from the text
function Annot({children, top, left, right, bottom, dir='down', arrow=true, color, w=140, style}){
  // The arrow svg points from the label box toward the target. Caller positions
  // by approx target location and we offset text by w to one side.
  const arrowSvg = {
    down:  <svg width={w} height="32" viewBox={`0 0 ${w} 32`}><path d={`M${w-20} 4 Q ${w/2} 14, 8 28`} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M3 26 L8 28 L7 22" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>,
    up:    <svg width={w} height="32" viewBox={`0 0 ${w} 32`}><path d={`M${w-20} 28 Q ${w/2} 18, 8 4`} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M3 6 L8 4 L7 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>,
    right: <svg width="32" height="40" viewBox="0 0 32 40"><path d="M4 8 Q 18 20, 28 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M22 32 L28 30 L25 24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>,
    left:  <svg width="32" height="40" viewBox="0 0 32 40"><path d="M28 8 Q 14 20, 4 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M10 32 L4 30 L7 24" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>,
  }[dir];
  return (
    <div className="annot" style={{top, left, right, bottom, color:color||'var(--royal)', maxWidth:w+20, ...style}}>
      {(dir==='up' || dir==='left') && arrow && <div style={{marginBottom:dir==='up'?-4:0}}>{arrowSvg}</div>}
      <span style={{display:'inline-block'}}>{children}</span>
      {(dir==='down' || dir==='right') && arrow && <div style={{marginTop:dir==='down'?-2:0}}>{arrowSvg}</div>}
    </div>
  );
}

// ─── Star rating
function Stars({n=5, filled=5, size=14}){
  return (
    <span style={{display:'inline-flex', gap:2}}>
      {Array.from({length:n}, (_,i)=>
        <span key={i} className="wf-star"
          style={{width:size, height:size, opacity: i<filled ? 1 : .25, filter: i<filled ? '' : 'grayscale(1)'}}/>
      )}
    </span>
  );
}

// ─── Browser chrome wrapper. children = page contents.
function Browser({children, url='behbehanimotors.com.kw / used-cars'}){
  return (
    <div className="browser" style={{width:'100%', height:'100%', display:'flex', flexDirection:'column'}}>
      <div className="browser-bar">
        <span className="browser-dot"/>
        <span className="browser-dot"/>
        <span className="browser-dot"/>
        <span className="browser-url">{url}</span>
        <span style={{fontFamily:'Kalam',fontSize:11,color:'#7a766c'}}>EN  ·  AR</span>
      </div>
      <div className="scroller" style={{flex:1}}>{children}</div>
    </div>
  );
}

// ─── Phone chrome (used on mobile companion artboards)
function Phone({children}){
  return (
    <div className="phone" style={{width:'100%', height:'100%'}}>
      <div className="phone-screen">
        <div className="scroller" style={{height:'100%'}}>{children}</div>
      </div>
    </div>
  );
}

// ─── Site nav row (used inside Browser)
function NavBar({active='Buy a Car', minimal=false}){
  const items = ['Buy a Car','Sell a Car','Car Services','Finance','Insurance','About'];
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:18,
      padding:'14px 28px', borderBottom:'1.5px solid var(--ink)',
      background:'var(--paper)',
    }}>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <Box w={36} h={36} rough style={{display:'flex', alignItems:'center', justifyContent:'center'}} fill="royal">
          <H size={16} color="#fff" weight={700}>B</H>
        </Box>
        <div style={{lineHeight:1}}>
          <H size={14} weight={700}>BEHBEHANI</H><br/>
          <H size={10} color="var(--muted)" family="ui" style={{letterSpacing:1.5}}>MOTORS · KUWAIT</H>
        </div>
      </div>
      {!minimal && (
        <div style={{display:'flex', gap:18, marginLeft:20, flex:1}}>
          {items.map(label=> (
            <span key={label} style={{
              fontFamily:'Kalam,cursive', fontSize:14,
              color: label===active ? 'var(--royal)' : 'var(--ink)',
              fontWeight: label===active ? 700 : 400,
              borderBottom: label===active ? '2px solid var(--royal)' : 'none',
              paddingBottom:2,
            }}>{label}</span>
          ))}
        </div>
      )}
      {minimal && <div style={{flex:1}}/>}
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <Btn ghost>♡ Favorites</Btn>
        <Btn>Sign in</Btn>
        <Btn primary>Sell your car</Btn>
      </div>
    </div>
  );
}

// ─── Site footer (very rough)
function Footer(){
  return (
    <div style={{borderTop:'1.5px solid var(--ink)', padding:'30px 28px', background:'var(--paper-2)'}}>
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:24}}>
        <div>
          <H size={16} weight={700}>BEHBEHANI MOTORS</H>
          <div style={{height:6}}/>
          <Lines n={3} widths={['long','mid','short']}/>
          <div style={{height:10}}/>
          <H size={12} color="var(--muted)">© 2026 · State of Kuwait · KWD</H>
        </div>
        {['Buy','Sell','Services','Support'].map(col=>(
          <div key={col}>
            <H size={13} weight={700}>{col}</H>
            <div style={{height:8}}/>
            <Lines n={4} widths={['mid','short','long','mid']}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── A car listing card (used in rails and grids)
function CarCard({h=260, w=260, badge, price='KWD 6,750', monthly='KWD 145/mo', km='42,300 km', spec='2022 · Auto · Petrol', model='Toyota Camry GLX', reserved=false, drop=false, blue=false, density=1}){
  return (
    <Box w={w} h={h} rough style={{display:'flex', flexDirection:'column', overflow:'hidden', padding:0}}>
      <div style={{position:'relative', flex:'0 0 55%'}}>
        <Img variant="car" h="100%" w="100%"/>
        {badge && <div style={{position:'absolute', top:8, left:8}}><Badge royal>{badge}</Badge></div>}
        {drop && <div style={{position:'absolute', top:8, right:8}}><Badge>↓ price</Badge></div>}
        {reserved && (
          <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <H size={14} weight={700} color="#fff">RESERVED · 41:22 left</H>
          </div>
        )}
        <div style={{position:'absolute', top:8, right: drop?56:8, width:24, height:24, borderRadius:'50%', background:'#fff', border:'1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <span style={{fontSize:14}}>♡</span>
        </div>
      </div>
      <div style={{padding:'10px 12px', flex:1, display:'flex', flexDirection:'column', gap:4}}>
        <H size={14} weight={700}>{model}</H>
        <H size={11} color="var(--muted)">{spec} · {km}</H>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:'auto'}}>
          <H size={16} weight={700} color={blue?'var(--royal)':'var(--ink)'}>{price}</H>
          <H size={11} color="var(--muted)">{monthly}</H>
        </div>
      </div>
    </Box>
  );
}

// ─── Trust bar / pill row (Inspected · Insured · Returnable · Delivered)
function TrustBar({inline=false, style}){
  const items = [
    ['🔍','71-pt inspected'],
    ['🛡','One-click insured'],
    ['↩','3-day / 300 km return'],
    ['🚚','Home delivery'],
  ];
  return (
    <div style={{
      display:'flex', gap: inline?12:24, alignItems:'center',
      padding: inline?'8px 0':'18px 28px',
      background: inline?'transparent':'var(--royal-pale)',
      borderTop: inline?'none':'1.5px solid var(--royal)',
      borderBottom: inline?'none':'1.5px solid var(--royal)',
      ...style,
    }}>
      {items.map(([icon,label])=>(
        <div key={label} style={{display:'flex', alignItems:'center', gap:6}}>
          <Box rough thin w={26} h={26} fill="royal" style={{display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%'}}>
            <H size={12} color="#fff">{icon}</H>
          </Box>
          <H size={13} weight={500}>{label}</H>
        </div>
      ))}
    </div>
  );
}

// ─── Cover artboard for the canvas intro
function CoverArtboard(){
  return (
    <div style={{padding:'40px 48px', height:'100%', background:'linear-gradient(180deg, #fdfcf8 0%, #f0eee4 100%)', display:'flex', flexDirection:'column', gap:18}}>
      <H family="caveat" size={32} weight={600} color="var(--royal)">Behbehani Motors</H>
      <H family="caveat" size={48} weight={700} style={{lineHeight:1.05, maxWidth:560}}>Online car marketplace · Kuwait market · wireframe explorations</H>

      <div style={{height:14}}/>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
        <div>
          <H size={14} weight={700} color="var(--muted)" family="ui" style={{letterSpacing:1, textTransform:'uppercase'}}>What's in here</H>
          <div style={{height:8}}/>
          <Lines n={5} widths={['full','long','mid','long','short']}/>
          <div style={{height:10}}/>
          <H size={15}>8 screen groups · ~25 sketches · 1 RTL mirror · drag/reorder/delete enabled.</H>
        </div>
        <div>
          <H size={14} weight={700} color="var(--muted)" family="ui" style={{letterSpacing:1, textTransform:'uppercase'}}>Legend</H>
          <div style={{height:8}}/>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            <div style={{display:'flex', gap:8, alignItems:'center'}}><Box w={32} h={20} rough/> <H size={13}>generic UI box</H></div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}><Box w={32} h={20} rough fill="royal"/> <H size={13}>primary CTA / accent</H></div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}><div style={{width:32, height:20, background:'#cfcbc0', borderRadius:3}}/> <H size={13}>placeholder text</H></div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}><Img w={32} h={20} variant="car"/> <H size={13}>photo / car image</H></div>
            <div style={{display:'flex', gap:8, alignItems:'center'}}><H size={14} family="caveat" color="var(--royal)">↳ designer note</H></div>
          </div>
        </div>
      </div>

      <div style={{height:20}}/>
      <Box rough p={18} fill="pale" style={{borderColor:'var(--royal)'}}>
        <H size={14} weight={700} color="var(--royal)">Open Tweaks (bottom-right)</H>
        <div style={{height:6}}/>
        <H size={13} color="var(--ink)">Toggle sketch roughness, royal-blue accent, annotation overlay, and density to see how the system holds up.</H>
      </Box>

      <div style={{display:'flex', gap:8, marginTop:'auto'}}>
        <Chip>Royal blue #1E3A8A</Chip>
        <Chip>White / paper</Chip>
        <Chip>Kalam + Caveat hand fonts</Chip>
        <Chip>Inter for UI text</Chip>
      </div>
    </div>
  );
}

Object.assign(window, {
  Img, Box, Lines, H, Btn, Chip, Badge, Annot, Stars,
  Browser, Phone, NavBar, Footer, CarCard, TrustBar,
  CoverArtboard,
});
