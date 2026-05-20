// wf-finance.jsx — Multi-bank financing variations.

const BANKS = [
  ['NBK',   'National Bank of Kuwait', 4.99, 'Best APR',     145, '+200 cash back', true],
  ['KFH',   'Kuwait Finance House',   5.25, 'Islamic',       149, 'Sharia-compliant'],
  ['Burgan','Burgan Bank',            5.45, 'Lowest fees',   152, 'Zero processing fee'],
  ['ABK',   'Al Ahli Bank of Kuwait', 5.50, 'Anchor partner',153, 'Pre-approved instantly'],
  ['Gulf',  'Gulf Bank',              5.75, '—',             156, 'Flexible tenure'],
  ['CBK',   'Commercial Bank Kuwait', 5.90, '—',             158, '36–84 month options'],
];

function CarRow(){
  return (
    <Box rough p={14} style={{display:'flex', gap:14, alignItems:'center'}}>
      <Img variant="car" h={80} w={130}/>
      <div>
        <H size={15} weight={700}>2022 Toyota Camry GLX</H>
        <H size={11} color="var(--muted)">KWD 6,750 · down KWD 500 · finance KWD 6,250</H>
      </div>
      <div style={{flex:1}}/>
      <H size={11} color="var(--royal)" style={{textDecoration:'underline'}}>change car ✎</H>
    </Box>
  );
}

function FinanceHeader(){
  return (
    <>
      <NavBar active="Finance"/>
      <div style={{padding:'20px 28px', borderBottom:'1.5px solid var(--ink)'}}>
        <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>FINANCE THIS CAR · MULTI-BANK</H>
        <H family="caveat" size={30} weight={700}>6 partner banks · soft credit check · no impact on your score</H>
        <H size={13} color="var(--muted)">Behbehani Motors fans your application out to all eligible partners. Pick your favourite — pre-approval is instant.</H>
      </div>
    </>
  );
}

// ── A · Comparison table
function FinanceTable(){
  return (
    <Browser url="behbehanimotors.com.kw / finance/offers/8421 · table">
      <FinanceHeader/>
      <div style={{padding:'20px 28px'}}>
        <CarRow/>

        <div style={{height:18}}/>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <H size={12}>Down payment:</H><Box rough thin p="4px 10px" style={{background:'#fff'}}><H size={12} weight={700}>KWD 500</H></Box>
          <H size={12}>Tenure:</H><Box rough thin p="4px 10px" style={{background:'#fff'}}><H size={12} weight={700}>60 months ▾</H></Box>
          <H size={12}>Employment:</H><Box rough thin p="4px 10px" style={{background:'#fff'}}><H size={12} weight={700}>Private sector ▾</H></Box>
          <div style={{flex:1}}/>
          <Btn primary>Recalculate</Btn>
        </div>

        <div style={{height:18}}/>

        {/* Table */}
        <Box rough p={0} style={{overflow:'hidden'}}>
          <div style={{display:'grid', gridTemplateColumns:'40px 2fr 1fr 1fr 1fr 1.5fr 1fr', padding:'12px 16px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
            {['','Bank','APR','Monthly','Total cost','Perk','Action'].map(h=> <H key={h} size={11} weight={700} family="ui" color="var(--muted)" style={{letterSpacing:1.5}}>{h.toUpperCase()}</H>)}
          </div>
          {BANKS.map(([code,name,apr,tag,mo,perk,best],i)=>(
            <div key={code} style={{
              display:'grid', gridTemplateColumns:'40px 2fr 1fr 1fr 1fr 1.5fr 1fr',
              padding:'14px 16px', alignItems:'center',
              borderBottom: i<BANKS.length-1?'1px dashed var(--light)':'none',
              background: best?'var(--royal-pale)':'#fff'
            }}>
              <Box rough thin w={26} h={26}>
                <H size={11} weight={700} style={{display:'block', textAlign:'center', lineHeight:'24px'}}>{code[0]}</H>
              </Box>
              <div>
                <H size={13} weight={700}>{name}</H>
                <H size={11} color="var(--muted)">{tag}</H>
              </div>
              <H size={15} weight={700}>{apr.toFixed(2)}%</H>
              <H size={15} weight={700} color={best?'var(--royal)':'var(--ink)'}>KWD {mo}</H>
              <H size={13}>KWD {(mo*60).toLocaleString()}</H>
              <H size={11} color="var(--muted)">{perk}</H>
              <div>
                {best ? <Btn primary>Choose →</Btn> : <Btn>Choose</Btn>}
              </div>
            </div>
          ))}
        </Box>

        <Annot top={420} right={20} dir="right" w={130}>Table = transparent · best for analytical buyers</Annot>

        <div style={{height:18}}/>
        <Box rough p={16} accent="blue-2">
          <H size={13} weight={700} color="var(--royal)">★ NBK recommended for you</H>
          <H size={12} color="var(--muted)">Based on your employment (gov't), tenure, and previous loan history — NBK offers the best rate for your profile.</H>
        </Box>

        <div style={{height:18}}/>
        <H family="caveat" size={20} weight={700}>How this works</H>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:10}}>
          {[
            ['Soft check now', 'No impact on credit'],
            ['Compare offers', 'Pick the bank'],
            ['Upload docs', 'Civil ID, salary cert.'],
            ['Sign & drive', 'Bank funds the seller'],
          ].map(([t,d],i)=>(
            <Box key={t} rough thin p={12}>
              <H size={11} weight={700} color="var(--royal)">{i+1}</H>
              <H size={13} weight={700}>{t}</H>
              <H size={11} color="var(--muted)">{d}</H>
            </Box>
          ))}
        </div>
      </div>
      <Footer/>
    </Browser>
  );
}

// ── B · Card grid with recommended highlight
function FinanceCards(){
  return (
    <Browser url="behbehanimotors.com.kw / finance/offers/8421 · cards">
      <FinanceHeader/>
      <div style={{padding:'20px 28px'}}>
        <CarRow/>
        <div style={{height:18}}/>
        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <Chip>Down KWD 500 ▾</Chip>
          <Chip>60 months ▾</Chip>
          <Chip>Private sector ▾</Chip>
          <div style={{flex:1}}/>
          <H size={12} color="var(--muted)">Sort: lowest monthly ▾</H>
        </div>

        <div style={{height:18}}/>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14}}>
          {BANKS.map(([code,name,apr,tag,mo,perk,best])=>(
            <Box key={code} rough p={0} accent={best?'blue':null} style={{overflow:'hidden', position:'relative'}}>
              {best && <div style={{padding:'6px 14px', background:'var(--royal)', color:'#fff'}}><H size={11} weight={700} color="#fff">★ RECOMMENDED FOR YOU</H></div>}
              <div style={{padding:'14px 16px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div style={{display:'flex', gap:10, alignItems:'center'}}>
                    <Box rough thin w={40} h={40} fill={best?'royal':null} style={{display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8}}>
                      <H size={14} weight={700} color={best?'#fff':'var(--ink)'}>{code[0]}</H>
                    </Box>
                    <div>
                      <H size={13} weight={700}>{name}</H>
                      <H size={10} color="var(--muted)">{tag}</H>
                    </div>
                  </div>
                  {best && <Box rough thin w={26} h={26} fill="royal" style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}><H size={12} color="#fff" weight={700}>✓</H></Box>}
                </div>

                <div style={{height:14}}/>
                <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                  <H family="caveat" size={32} weight={700} color="var(--royal)">KWD {mo}</H>
                  <H size={12} color="var(--muted)">/month</H>
                </div>
                <H size={12} color="var(--muted)">{apr.toFixed(2)}% APR · 60 mo · total KWD {(mo*60).toLocaleString()}</H>

                <div style={{height:12}}/>
                <Box rough thin p={8} style={{background:'#fff'}}>
                  <H size={11} weight={700}>🎁 {perk}</H>
                </Box>

                <div style={{height:14}}/>
                <div style={{display:'flex', gap:6}}>
                  <Btn primary={best} style={{flex:1, justifyContent:'center'}}>{best?'Choose →':'Choose'}</Btn>
                  <Btn>Details</Btn>
                </div>
              </div>
            </Box>
          ))}
        </div>

        <div style={{height:24}}/>
        <Box rough p={16}>
          <H size={13} weight={700}>What we'll need next</H>
          <H size={12} color="var(--muted)">Civil ID · last 3 bank statements · salary certificate · passport (expats)</H>
          <H size={12} color="var(--royal)" style={{textDecoration:'underline', marginTop:6}}>Upload now to speed approval →</H>
        </Box>
      </div>
      <Annot top={300} right={20} dir="right" w={140}>Cards = visual hierarchy · recommendation gets the badge</Annot>
      <Footer/>
    </Browser>
  );
}

// ── C · Live-update sliders
function FinanceLive(){
  return (
    <Browser url="behbehanimotors.com.kw / finance/offers/8421 · live">
      <FinanceHeader/>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1.5fr', minHeight:920}}>
        {/* Slider controls */}
        <div style={{padding:'30px 32px', borderRight:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
          <H family="caveat" size={22} weight={700}>Tune your finance</H>
          <H size={12} color="var(--muted)">Move the sliders — offers update live</H>

          <div style={{height:24}}/>
          <CarRow/>

          {[
            ['Car price', 'KWD 6,750', null],
            ['Down payment', 'KWD 500', 0.07],
            ['Tenure', '60 months', 0.5],
            ['Monthly budget', 'up to KWD 180', 0.65],
          ].map(([label,val,pos])=>(
            <div key={label} style={{marginTop:20}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <H size={12} weight={700}>{label}</H>
                <H size={12} weight={700} color="var(--royal)">{val}</H>
              </div>
              {pos != null && (
                <div style={{height:6, background:'#fff', border:'1.5px solid var(--ink)', borderRadius:4, marginTop:8, position:'relative'}}>
                  <div style={{position:'absolute', left:0, width:`${pos*100}%`, top:-1.5, bottom:-1.5, background:'var(--royal)', borderRadius:3}}/>
                  <div style={{position:'absolute', left:`calc(${pos*100}% - 9px)`, top:-6, width:18, height:18, background:'#fff', border:'1.5px solid var(--ink)', borderRadius:'50%'}}/>
                </div>
              )}
            </div>
          ))}

          <div style={{height:30}}/>
          <H size={12} weight={700}>Your profile</H>
          <div style={{display:'flex', gap:6, marginTop:6, flexWrap:'wrap'}}>
            <Chip>Private sector</Chip>
            <Chip>Salary KWD 1,200</Chip>
            <Chip>5 yrs employed</Chip>
            <Chip accent>+ edit</Chip>
          </div>

          <div style={{height:18}}/>
          <Box rough p={12} accent="blue-2">
            <H size={11} color="var(--muted)">Eligibility</H>
            <H size={14} weight={700} color="var(--royal)">✓ Pre-qualified · all 6 banks</H>
          </Box>
        </div>

        {/* Live offers list */}
        <div style={{padding:'30px 32px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
            <H family="caveat" size={22} weight={700}>6 live offers</H>
            <H size={11} color="var(--muted)">last updated 0.2s ago · sorted by monthly</H>
          </div>
          <div style={{height:14}}/>

          {BANKS.map(([code,name,apr,tag,mo,perk,best],i)=>(
            <Box key={code} rough p={14} accent={best?'blue':null} style={{display:'flex', alignItems:'center', gap:14, marginBottom:8}}>
              <Box rough thin w={40} h={40} fill={best?'royal':null} style={{display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8}}>
                <H size={14} weight={700} color={best?'#fff':'var(--ink)'}>{code[0]}</H>
              </Box>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                  <H size={13} weight={700}>{name}</H>
                  {best && <H size={10} weight={700} color="var(--royal)" style={{letterSpacing:1.5}} family="ui">★ BEST FIT</H>}
                </div>
                <H size={11} color="var(--muted)">{apr.toFixed(2)}% APR · 60 mo · {perk}</H>
              </div>
              <div style={{textAlign:'right'}}>
                <H size={20} weight={700} color={best?'var(--royal)':'var(--ink)'}>KWD {mo}</H>
                <H size={11} color="var(--muted)">/month</H>
              </div>
              <Btn primary={best}>{best?'Choose →':'Choose'}</Btn>
            </Box>
          ))}

          <div style={{height:14}}/>
          <H size={12} color="var(--muted)" style={{textAlign:'center'}}>⚡ Offers re-fetched in real time from partner banks</H>
        </div>
      </div>
      <Annot top={120} right={20} dir="right" w={140}>Live update = interactive · feels like a calculator, not a form</Annot>
      <Footer/>
    </Browser>
  );
}

Object.assign(window, { FinanceTable, FinanceCards, FinanceLive });
