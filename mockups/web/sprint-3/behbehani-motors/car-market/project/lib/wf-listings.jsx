// wf-listings.jsx — 4 listings/filter variations.

// ── A · Sidebar filters + grid (standard, dense)
function ListSidebar(){
  return (
    <Browser url="behbehanimotors.com.kw / used-cars">
      <NavBar active="Buy a Car"/>
      <div style={{padding:'14px 28px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)', display:'flex', gap:10, alignItems:'center'}}>
        <H size={13} color="var(--muted)">Home › Used cars › Toyota</H>
        <div style={{flex:1}}/>
        <H size={13} weight={700}>1,240 cars</H>
        <H size={12} color="var(--muted)">Sort: Best match ▾</H>
        <Box rough thin p="4px 8px"><H size={11}>⊞ Grid</H></Box>
        <Box rough thin p="4px 8px"><H size={11}>☰ List</H></Box>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'280px 1fr', minHeight:1050}}>
        {/* Sidebar */}
        <div style={{padding:'18px 20px', borderRight:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
          <H size={14} weight={700}>Filters</H>
          <div style={{height:10}}/>
          {[
            ['Make', ['Toyota (84)','Lexus (62)','BMW (44)','Mercedes (38)','+ more']],
            ['Body type', ['Sedan','SUV','Coupe','Pickup','Hatchback']],
            ['Price range', null],
            ['Monthly payment', null],
            ['Year', null],
            ['Mileage', null],
            ['Transmission', ['Automatic','Manual','CVT']],
            ['Fuel', ['Petrol','Diesel','Hybrid','Electric']],
            ['Regional specs', ['GCC','American','European','Japanese']],
            ['Seller type', ['Behbehani Retail','Certified dealer','Private']],
          ].map(([label, opts])=>(
            <div key={label} style={{marginBottom:14, paddingBottom:10, borderBottom:'1px dashed var(--light)'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <H size={13} weight={700}>{label}</H>
                <H size={11} color="var(--muted)">−</H>
              </div>
              <div style={{height:6}}/>
              {opts && opts.map(o=>(
                <div key={o} style={{display:'flex', alignItems:'center', gap:6, marginBottom:3}}>
                  <Box rough thin w={14} h={14}/><H size={12}>{o}</H>
                </div>
              ))}
              {!opts && (
                <>
                  <div style={{display:'flex', gap:6, marginBottom:6}}>
                    <Box rough thin p="3px 6px" style={{flex:1}}><H size={11} color="var(--muted)">min</H></Box>
                    <Box rough thin p="3px 6px" style={{flex:1}}><H size={11} color="var(--muted)">max</H></Box>
                  </div>
                  <div style={{height:8, background:'#fff', border:'1.5px solid var(--ink)', borderRadius:4, position:'relative'}}>
                    <div style={{position:'absolute', left:'20%', right:'30%', top:-1, bottom:-1, background:'var(--royal)', borderRadius:4}}/>
                    <div style={{position:'absolute', left:'20%', top:-4, width:12, height:14, background:'#fff', border:'1.5px solid var(--ink)', borderRadius:3}}/>
                    <div style={{position:'absolute', right:'30%', top:-4, width:12, height:14, background:'#fff', border:'1.5px solid var(--ink)', borderRadius:3}}/>
                  </div>
                </>
              )}
            </div>
          ))}
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 0'}}>
            <Box rough thin w={14} h={14} fill="royal"/><H size={12} weight={700}>71-pt inspected only</H>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <Box rough thin w={14} h={14}/><H size={12}>Has warranty</H>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <Box rough thin w={14} h={14}/><H size={12}>Reservable</H>
          </div>
          <div style={{height:14}}/>
          <Btn primary big style={{width:'100%', justifyContent:'center'}}>Apply filters</Btn>
          <div style={{height:8}}/>
          <H size={11} color="var(--royal)" style={{textAlign:'center'}}>↻ Save this search</H>
        </div>

        {/* Results */}
        <div style={{padding:'18px 20px'}}>
          <Box rough p={12} accent="blue-2" style={{display:'flex', gap:10, alignItems:'center', marginBottom:14}}>
            <H size={13} weight={700} color="var(--royal)">✓ Live count:</H>
            <H size={13}>1,240 cars matching · 280 inspected · 142 reservable</H>
            <div style={{flex:1}}/>
            <H size={12} color="var(--royal)">Save alert →</H>
          </Box>

          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14}}>
            {Array.from({length:9}).map((_,i)=>(
              <CarCard key={i} h={250} w="100%"
                badge={i%3===0?'Inspected':i%3===1?'Low km':'Warranty'}
                model={['Toyota Camry GLX','Lexus IS 300','BMW 320i','Nissan Patrol','GMC Yukon','Mercedes C200','Mazda CX-5','Honda Civic','Toyota Land Cruiser'][i]}
                price={`KWD ${(5+i*1.2).toFixed(1)}K`}
                monthly={`KWD ${(95+i*15)}/mo`}
                reserved={i===4}
                blue={i===0}/>
            ))}
          </div>
          <div style={{display:'flex', justifyContent:'center', gap:6, marginTop:24}}>
            {['‹',1,2,3,4,'…',62,'›'].map((p,i)=>
              <Box key={i} rough thin w={32} h={32} style={{display:'flex',alignItems:'center',justifyContent:'center', background: p===1?'var(--royal)':'#fff', color:p===1?'#fff':'var(--ink)', borderColor: p===1?'var(--royal)':'var(--ink)'}}><H size={12} color={p===1?'#fff':'var(--ink)'}>{p}</H></Box>
            )}
          </div>
        </div>
      </div>
      <Footer/>
    </Browser>
  );
}

// ── B · Top chip filters + larger cards (modern, mobile-first feel)
function ListChips(){
  return (
    <Browser url="behbehanimotors.com.kw / used-cars · chips">
      <NavBar active="Buy a Car"/>

      {/* Sticky search + chip bar */}
      <div style={{padding:'14px 28px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
        <Box rough p={4} style={{display:'flex', gap:4, background:'#fff'}}>
          <Box rough thin p="6px 12px" style={{flex:1}}><H size={13} color="var(--muted)">Search make, model, trim…</H></Box>
          <Btn primary>Search</Btn>
        </Box>
        <div style={{height:12}}/>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          <Chip accent>All brands ▾</Chip>
          <Chip accent>Any body ▾</Chip>
          <Chip>Year: 2020 → 2024 ✕</Chip>
          <Chip>Price: ≤ 12K ✕</Chip>
          <Chip>Inspected only ✕</Chip>
          <Chip>Auto ✕</Chip>
          <Chip>+ More filters</Chip>
          <div style={{flex:1}}/>
          <Chip>↻ Clear all</Chip>
        </div>
      </div>

      <div style={{padding:'18px 28px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <H size={14} weight={700}>842 cars match · live</H>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <H size={12} color="var(--muted)">Sort by</H>
          <Box rough thin p="4px 10px"><H size={12}>Best match ▾</H></Box>
          <Box rough thin p="4px 10px"><H size={12}>⊞ Grid</H></Box>
        </div>
      </div>

      <div style={{padding:'0 28px 30px'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18}}>
          {Array.from({length:9}).map((_,i)=>(
            <Box key={i} rough h={340} p={0} style={{overflow:'hidden', display:'flex', flexDirection:'column'}}>
              <div style={{position:'relative', height:200, borderBottom:'1.5px solid var(--ink)'}}>
                <Img variant="car" h="100%"/>
                <div style={{position:'absolute', top:10, left:10}}>
                  <Badge royal>71-pt inspected</Badge>
                </div>
                <div style={{position:'absolute', top:10, right:10, display:'flex', gap:6}}>
                  <div style={{width:30, height:30, borderRadius:'50%', background:'#fff', border:'1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center'}}>♡</div>
                </div>
                {i===2 && <div style={{position:'absolute', bottom:10, left:10}}><Badge>↓ price KWD 400</Badge></div>}
              </div>
              <div style={{padding:14, flex:1, display:'flex', flexDirection:'column', gap:6}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <H size={15} weight={700}>{['Toyota Camry GLX','Lexus IS 300','BMW 320i','Nissan Patrol','GMC Yukon','Mercedes C200','Mazda CX-5','Honda Civic','Toyota LC'][i]}</H>
                  <H size={16} weight={700} color="var(--royal)">KWD {(6+i*0.9).toFixed(1)}K</H>
                </div>
                <H size={12} color="var(--muted)">2022 · 42K km · Auto · GCC · Petrol</H>
                <div style={{display:'flex', gap:6, marginTop:4}}>
                  <Chip>Inspected</Chip>
                  <Chip>1 owner</Chip>
                  <Chip>No accident</Chip>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'auto'}}>
                  <H size={12} color="var(--muted)">~ KWD {130+i*12} / month</H>
                  <Btn primary>Reserve</Btn>
                </div>
              </div>
            </Box>
          ))}
        </div>
      </div>

      <Annot top={200} right={10} dir="right" w={130}>Chips feel lighter — bias mobile-friendly</Annot>
      <Footer/>
    </Browser>
  );
}

// ── C · Map split + drawer (location-aware, governorate filter)
function ListMap(){
  return (
    <Browser url="behbehanimotors.com.kw / used-cars · map view">
      <NavBar active="Buy a Car"/>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', height:1180}}>
        {/* Results */}
        <div style={{borderRight:'1.5px solid var(--ink)', display:'flex', flexDirection:'column'}}>
          <div style={{padding:'14px 20px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <Btn>≡ Filters (4)</Btn>
              <Box rough thin p="6px 12px" style={{flex:1, background:'#fff'}}><H size={12} color="var(--muted)">In Kuwait City, Hawalli, Salmiya…</H></Box>
              <Btn primary>Apply</Btn>
            </div>
            <div style={{height:10}}/>
            <H size={13} weight={700}>286 cars in selected area · 12 km radius</H>
          </div>
          <div style={{padding:'12px 20px', display:'flex', flexDirection:'column', gap:10, overflow:'auto', flex:1}}>
            {Array.from({length:7}).map((_,i)=>(
              <Box key={i} rough p={0} style={{display:'flex', gap:0, overflow:'hidden'}}>
                <div style={{width:160, borderRight:'1.5px solid var(--ink)', position:'relative'}}>
                  <Img variant="car" h={120} w="100%"/>
                  <div style={{position:'absolute', top:6, left:6}}><Badge royal>Pin {i+1}</Badge></div>
                </div>
                <div style={{flex:1, padding:'10px 14px'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <H size={14} weight={700}>{['Toyota Camry GLX','Lexus IS 300','BMW 320i','Mercedes C200','Nissan Patrol','GMC Yukon','Honda Accord'][i]}</H>
                    <H size={14} weight={700} color="var(--royal)">KWD {(7+i*1.3).toFixed(1)}K</H>
                  </div>
                  <H size={11} color="var(--muted)">2022 · 42K km · GCC · Auto</H>
                  <div style={{height:6}}/>
                  <H size={11}>📍 {['Hawalli · 3 km','Salmiya · 5 km','Kuwait City · 7 km','Salwa · 8 km','Mishref · 10 km','Jabriya · 12 km','Sabah Al Salem · 15 km'][i]}</H>
                  <div style={{height:8}}/>
                  <div style={{display:'flex', gap:6, alignItems:'center'}}>
                    <Chip>Inspected</Chip>
                    <div style={{flex:1}}/>
                    <Btn>View →</Btn>
                  </div>
                </div>
              </Box>
            ))}
          </div>
        </div>

        {/* Map */}
        <div style={{position:'relative', background:'#e8e5dc'}}>
          {/* Fake map */}
          <svg width="100%" height="100%" viewBox="0 0 600 1180" preserveAspectRatio="none">
            <rect width="600" height="1180" fill="#e8e5dc"/>
            {Array.from({length:30}).map((_,i)=>(
              <path key={i} d={`M${(i*73)%600} ${(i*113)%1180} L${(i*73+200)%600} ${(i*113+150)%1180}`} stroke="#bbb6a8" strokeWidth="1.5" fill="none"/>
            ))}
            {Array.from({length:8}).map((_,i)=>(
              <circle key={i} cx={120+(i*60)%440} cy={180+(i*120)%900} r="22" fill="var(--royal)" stroke="#fff" strokeWidth="2.5"/>
            ))}
            {Array.from({length:8}).map((_,i)=>(
              <text key={'t'+i} x={120+(i*60)%440} y={186+(i*120)%900} fontSize="14" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Kalam">{i+1}</text>
            ))}
          </svg>
          <div style={{position:'absolute', top:14, left:14, background:'#fff', border:'1.5px solid var(--ink)', borderRadius:6, padding:'6px 10px', display:'flex', gap:6, alignItems:'center'}}>
            <H size={12}>Governorate:</H>
            <H size={12} weight={700}>Hawalli, Capital, Mubarak ✕</H>
          </div>
          <div style={{position:'absolute', top:14, right:14, display:'flex', flexDirection:'column', gap:6}}>
            <Box rough thin w={36} h={36} style={{display:'flex',alignItems:'center',justifyContent:'center', background:'#fff'}}><H size={16}>+</H></Box>
            <Box rough thin w={36} h={36} style={{display:'flex',alignItems:'center',justifyContent:'center', background:'#fff'}}><H size={16}>−</H></Box>
            <Box rough thin w={36} h={36} style={{display:'flex',alignItems:'center',justifyContent:'center', background:'#fff'}}><H size={14}>⊙</H></Box>
          </div>
          <Annot bottom={40} left={20} dir="up" color="var(--royal)" w={170}>Bet that delivery distance matters for buyers</Annot>
        </div>
      </div>
      <Footer/>
    </Browser>
  );
}

// ── D · Monthly-payment-first (lead with affordability)
function ListMonthly(){
  return (
    <Browser url="behbehanimotors.com.kw / cars-by-monthly-payment">
      <NavBar active="Buy a Car"/>

      <div style={{padding:'30px 28px', background:'var(--royal)', color:'#fff', borderBottom:'1.5px solid var(--ink)'}}>
        <H family="caveat" size={36} color="#fff" weight={700}>Shop by what you can pay monthly</H>
        <div style={{height:6}}/>
        <H size={14} color="#fff" style={{opacity:.85}}>Pre-qualified offers from 6 partner banks · soft credit check, no impact</H>

        <div style={{height:20}}/>
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:14, alignItems:'center'}}>
          <div>
            <H size={12} color="#fff" style={{opacity:.8}}>I can pay up to / month</H>
            <div style={{height:8}}/>
            <div style={{display:'flex', alignItems:'baseline', gap:8}}>
              <H size={36} color="#fff" weight={700}>KWD 180</H>
              <H size={13} color="#fff" style={{opacity:.7}}>/month</H>
            </div>
            <div style={{height:8}}/>
            <div style={{height:8, background:'rgba(255,255,255,.2)', borderRadius:4, position:'relative'}}>
              <div style={{position:'absolute', left:'25%', width:18, height:18, top:-5, background:'#fff', borderRadius:'50%', border:'2px solid var(--royal)'}}/>
            </div>
          </div>
          <div>
            <H size={12} color="#fff" style={{opacity:.8}}>Down payment</H>
            <div style={{height:8}}/>
            <Box rough p="8px 10px" style={{background:'#fff'}}><H size={16} weight={700}>KWD 500</H></Box>
          </div>
          <div>
            <H size={12} color="#fff" style={{opacity:.8}}>Tenure</H>
            <div style={{height:8}}/>
            <Box rough p="8px 10px" style={{background:'#fff'}}><H size={16} weight={700}>60 months ▾</H></Box>
          </div>
          <div>
            <H size={12} color="#fff" style={{opacity:.8}}>APR (best partner)</H>
            <div style={{height:8}}/>
            <Box rough p="8px 10px" style={{background:'#fff'}}><H size={16} weight={700}>4.99% ▾</H></Box>
          </div>
        </div>
        <div style={{height:14}}/>
        <H size={13} color="#fff" style={{opacity:.85}}>= up to <b style={{textDecoration:'underline'}}>KWD 9,200</b> in car price · 184 cars match</H>
      </div>

      <div style={{padding:'18px 28px', borderBottom:'1px solid var(--light)', display:'flex', gap:8, alignItems:'center'}}>
        <H size={12} color="var(--muted)">Refine:</H>
        {['SUV ✕','Auto ✕','Petrol ✕','Inspected ✕'].map(c=> <Chip key={c}>{c}</Chip>)}
        <div style={{flex:1}}/>
        <H size={12} color="var(--muted)">Sort: Lowest monthly ▾</H>
      </div>

      <div style={{padding:'20px 28px'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14}}>
          {Array.from({length:9}).map((_,i)=>(
            <Box key={i} rough p={0} style={{overflow:'hidden'}} accent={i===0?'blue':null}>
              {i===0 && <div style={{padding:'6px 12px', background:'var(--royal)', color:'#fff'}}><H size={11} weight={700} color="#fff">★ BEST FIT FOR YOUR BUDGET</H></div>}
              <div style={{position:'relative', height:170, borderBottom:'1.5px solid var(--ink)'}}>
                <Img variant="car" h="100%"/>
              </div>
              <div style={{padding:'10px 14px'}}>
                <H size={14} weight={700}>{['Toyota Camry','Lexus IS','BMW 320i','Mercedes C200','Mazda CX-5','Honda Accord','Kia Sportage','Hyundai Tucson','Nissan Altima'][i]}</H>
                <H size={11} color="var(--muted)">2022 · 42K km · Auto</H>
                <div style={{height:10}}/>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                  <div>
                    <H size={20} weight={700} color="var(--royal)">KWD {(150+i*4)} </H>
                    <H size={11} color="var(--muted)">/ month</H>
                  </div>
                  <H size={12} color="var(--muted)">KWD {(6.8+i*0.4).toFixed(1)}K</H>
                </div>
                <div style={{height:8}}/>
                <H size={11} color="var(--royal)">✓ Pre-approved by NBK · 4.99% APR</H>
              </div>
            </Box>
          ))}
        </div>
      </div>
      <Annot top={80} right={20} dir="right" w={140}>Affordability up-front — Kuwait market expects this</Annot>
      <Footer/>
    </Browser>
  );
}

Object.assign(window, { ListSidebar, ListChips, ListMap, ListMonthly });
