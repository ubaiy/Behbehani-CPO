// wf-checkout.jsx — Reserve + 7-step purchase wizard variations.

const WIZARD_STEPS = [
  ['Payment method','KNET, Visa, bank transfer'],
  ['Trade-in','add your current car'],
  ['Add-ons','warranty, tint, ceramic'],
  ['Documents','Civil ID, license'],
  ['Sign contract','digital · e-signature'],
  ['Delivery slot','pick date & time'],
  ['Confirm','review & submit'],
];

function ReservationBanner({step=3, total=7}){
  return (
    <div style={{padding:'10px 28px', background:'var(--royal)', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1.5px solid var(--ink)'}}>
      <div style={{display:'flex', gap:14, alignItems:'center'}}>
        <Box rough thin w={28} h={28} style={{borderRadius:'50%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}><H size={12} weight={700}>🔒</H></Box>
        <H size={13} color="#fff" weight={700}>You reserved · 2022 Toyota Camry GLX</H>
        <H size={12} color="#fff" style={{opacity:.85}}>Hold expires in <b style={{fontFamily:'Kalam', fontWeight:700}}>41:22:18</b></H>
      </div>
      <H size={13} color="#fff" weight={700}>Step {step} of {total}</H>
    </div>
  );
}

function CarSummary(){
  return (
    <Box rough p={0} style={{overflow:'hidden'}}>
      <Img variant="car" h={160} w="100%"/>
      <div style={{padding:14}}>
        <H size={15} weight={700}>2022 Toyota Camry GLX</H>
        <H size={11} color="var(--muted)">42,300 km · GCC · Auto · 1 owner</H>
        <div style={{height:8}}/>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <H size={12} color="var(--muted)">Vehicle</H>
          <H size={12} weight={700}>KWD 6,750.000</H>
        </div>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <H size={12} color="var(--muted)">Reservation</H>
          <H size={12} weight={700}>− KWD 100.000</H>
        </div>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <H size={12} color="var(--muted)">Trade-in (Civic '18)</H>
          <H size={12} weight={700}>− KWD 2,800.000</H>
        </div>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <H size={12} color="var(--muted)">Add-ons (warranty)</H>
          <H size={12} weight={700}>+ KWD 150.000</H>
        </div>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <H size={12} color="var(--muted)">Insurance · comp.</H>
          <H size={12} weight={700}>+ KWD 220.000</H>
        </div>
        <div style={{borderTop:'1px dashed var(--light)', margin:'6px 0'}}/>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <H size={13} weight={700}>To finance / pay</H>
          <H size={16} weight={700} color="var(--royal)">KWD 4,220.000</H>
        </div>
        <div style={{height:4}}/>
        <H size={11} color="var(--muted)">≈ KWD 91 / month · NBK 4.99% · 60 mo</H>
      </div>
    </Box>
  );
}

function AddonStep(){
  return (
    <>
      <H family="caveat" size={28} weight={700}>Add-ons · make it yours</H>
      <H size={13} color="var(--muted)">Bundled at checkout for one price · cancel within return window</H>
      <div style={{height:18}}/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12}}>
        {[
          ['Extended warranty', 'KWD 150', '+12 months · all major systems', true],
          ['Window tinting', 'KWD 65', 'Front 35% · sides & rear 20%', false],
          ['Ceramic paint protection', 'KWD 280', '3-year coating · scratch-resistant', false],
          ['MOI registration renewal', 'KWD 25', 'Saves a trip · we handle it', true],
          ['Roadside assistance', 'KWD 35/y', '24/7 in Kuwait + GCC', false],
          ['GAP coverage', 'KWD 95/y', 'Covers loan balance if total loss', false],
        ].map(([t,p,d,sel])=>(
          <Box key={t} rough p={14} accent={sel?'blue':null}>
            <div style={{display:'flex', gap:10}}>
              <Box rough thin w={18} h={18} fill={sel?'royal':null} style={{borderRadius:4, marginTop:2}}>{sel && <span style={{color:'#fff', fontSize:12, paddingLeft:3}}>✓</span>}</Box>
              <div style={{flex:1}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <H size={14} weight={700}>{t}</H>
                  <H size={14} weight={700} color="var(--royal)">{p}</H>
                </div>
                <H size={12} color="var(--muted)">{d}</H>
              </div>
            </div>
          </Box>
        ))}
      </div>
    </>
  );
}

// ── A · Vertical stepper (left)
function ReserveVerticalStep(){
  return (
    <Browser url="behbehanimotors.com.kw / checkout/ord_8421">
      <NavBar minimal/>
      <ReservationBanner step={3}/>
      <div style={{display:'grid', gridTemplateColumns:'260px 1fr 320px', gap:0, minHeight:1100}}>
        {/* Vertical stepper */}
        <div style={{padding:'28px 22px', borderRight:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
          <H size={11} weight={700} family="ui" color="var(--muted)" style={{letterSpacing:2}}>YOUR PURCHASE</H>
          <div style={{height:12}}/>
          {WIZARD_STEPS.map(([t,s],i)=>{
            const state = i<2?'done':i===2?'active':'todo';
            return (
              <div key={t} style={{display:'flex', gap:10, padding:'12px 0', position:'relative'}}>
                <div style={{position:'relative', display:'flex', flexDirection:'column', alignItems:'center'}}>
                  <Box rough thin w={28} h={28} fill={state==='done'?'ink':state==='active'?'royal':null}
                    style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <H size={12} weight={700} color={state==='todo'?'var(--muted)':'#fff'}>{state==='done'?'✓':i+1}</H>
                  </Box>
                  {i<WIZARD_STEPS.length-1 && <div style={{width:1, flex:1, marginTop:4, background: state==='done'?'var(--ink)':'var(--light)', minHeight:18}}/>}
                </div>
                <div>
                  <H size={13} weight={state==='active'?700:500} color={state==='todo'?'var(--muted)':'var(--ink)'}>{t}</H>
                  <H size={11} color="var(--muted)">{s}</H>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{padding:'28px 32px'}}>
          <AddonStep/>
          <div style={{height:30}}/>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <Btn>← Back to trade-in</Btn>
            <Btn primary big>Continue to documents →</Btn>
          </div>
        </div>

        {/* Order summary */}
        <div style={{padding:'28px 22px', borderLeft:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
          <H size={11} weight={700} family="ui" color="var(--muted)" style={{letterSpacing:2}}>ORDER SUMMARY</H>
          <div style={{height:12}}/>
          <CarSummary/>
          <div style={{height:14}}/>
          <H size={11} color="var(--royal)" style={{textDecoration:'underline'}}>Edit trade-in</H>
        </div>
      </div>
      <Annot top={60} left={20} dir="left" color="var(--royal)" w={150}>Vertical stepper · best for ≥6 steps; user always sees their path</Annot>
    </Browser>
  );
}

// ── B · Horizontal stepper (top)
function ReserveHorizontalStep(){
  return (
    <Browser url="behbehanimotors.com.kw / checkout/ord_8421 · horizontal">
      <NavBar minimal/>
      <ReservationBanner step={3}/>

      {/* Horizontal stepper */}
      <div style={{padding:'24px 32px', borderBottom:'1.5px solid var(--ink)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          {WIZARD_STEPS.map(([t],i)=>{
            const state = i<2?'done':i===2?'active':'todo';
            return (
              <React.Fragment key={t}>
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6}}>
                  <Box rough thin w={36} h={36} fill={state==='done'?'ink':state==='active'?'royal':null}
                    style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <H size={14} weight={700} color={state==='todo'?'var(--muted)':'#fff'}>{state==='done'?'✓':i+1}</H>
                  </Box>
                  <H size={11} weight={state==='active'?700:400} color={state==='todo'?'var(--muted)':'var(--ink)'}>{t}</H>
                </div>
                {i<WIZARD_STEPS.length-1 && <div style={{flex:1, height:1.5, background: state==='done'?'var(--ink)':'var(--light)', marginBottom:18, marginLeft:-4, marginRight:-4}}/>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{padding:'30px 80px', maxWidth:900, margin:'0 auto'}}>
        <AddonStep/>
        <div style={{height:24}}/>
        <CarSummary/>
        <div style={{height:24}}/>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <Btn>← Trade-in</Btn>
          <Btn primary big>Continue · documents →</Btn>
        </div>
      </div>
      <Annot top={150} right={20} dir="right" w={140}>Horizontal · best when steps ≤ 5 — already crowded at 7</Annot>
    </Browser>
  );
}

// ── C · Split screen — car always visible
function ReserveSplit(){
  return (
    <Browser url="behbehanimotors.com.kw / checkout/ord_8421 · split">
      <NavBar minimal/>
      <ReservationBanner step={3}/>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', minHeight:1100}}>
        {/* LEFT — car sticky */}
        <div style={{padding:'30px 36px', borderRight:'1.5px solid var(--ink)', background:'linear-gradient(180deg, var(--paper-2) 0%, var(--paper) 100%)'}}>
          <div style={{position:'sticky', top:0}}>
            <H size={11} weight={700} family="ui" color="var(--muted)" style={{letterSpacing:2}}>YOU'RE BUYING</H>
            <div style={{height:8}}/>
            <H family="caveat" size={28} weight={700}>2022 Toyota Camry GLX</H>
            <H size={13} color="var(--muted)">Pearl white · 42,300 km · 1 owner</H>
            <div style={{height:14}}/>
            <Img variant="car" h={260} w="100%"/>
            <div style={{height:14}}/>

            {/* Mini step pills */}
            <div style={{display:'flex', gap:4, justifyContent:'center'}}>
              {WIZARD_STEPS.map((_,i)=>(
                <div key={i} style={{width:24, height:5, borderRadius:3, background: i<3 ? 'var(--royal)' : '#ddd'}}/>
              ))}
            </div>
            <H size={11} color="var(--muted)" style={{textAlign:'center', marginTop:6}}>Step 3 of 7 · Add-ons</H>

            <div style={{height:18}}/>
            <CarSummary/>

            <div style={{height:14}}/>
            <Box rough p={12} accent="blue-2">
              <H size={12} weight={700} color="var(--royal)">⏱ Hold expires in 41:22:18</H>
              <H size={11} color="var(--muted)">Reservation can be cancelled with full refund</H>
            </Box>
          </div>
        </div>

        {/* RIGHT — current step */}
        <div style={{padding:'30px 36px'}}>
          <AddonStep/>
          <div style={{height:24}}/>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <Btn>← Back</Btn>
            <Btn primary big>Continue → step 4</Btn>
          </div>
        </div>
      </div>
      <Annot top={70} left="46%" dir="up" color="var(--royal)" w={150}>Car never leaves the screen — emotional anchor</Annot>
    </Browser>
  );
}

Object.assign(window, { ReserveVerticalStep, ReserveHorizontalStep, ReserveSplit });
