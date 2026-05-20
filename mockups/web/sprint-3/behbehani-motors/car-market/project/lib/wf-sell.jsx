// wf-sell.jsx — Instant Online Valuation variations.

// ── A · Linear form
function SellLinear(){
  return (
    <Browser url="behbehanimotors.com.kw / sell-your-car/instant-valuation">
      <NavBar active="Sell a Car"/>
      <div style={{padding:'30px 28px', borderBottom:'1.5px solid var(--ink)'}}>
        <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>INSTANT ONLINE VALUATION · 60 SECONDS</H>
        <div style={{height:6}}/>
        <H family="caveat" size={36} weight={700}>Tell us about your car · get a guaranteed offer in 60 seconds</H>
        <H size={14} color="var(--muted)">Offer valid for 7 days · we'll buy or take it in part-exchange</H>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:0, minHeight:900}}>
        <div style={{padding:'30px 36px'}}>

          {/* Progress */}
          <div style={{display:'flex', gap:8, marginBottom:24}}>
            {['Car','Specs','Condition','You'].map((s,i)=>(
              <div key={s} style={{flex:1, display:'flex', flexDirection:'column', gap:6}}>
                <div style={{height:5, background: i<2?'var(--royal)': '#ddd', borderRadius:3}}/>
                <H size={11} weight={i===2?700:400} color={i<2?'var(--ink)':'var(--muted)'}>{s}</H>
              </div>
            ))}
          </div>

          <H family="caveat" size={22} weight={700}>3 of 4 · Condition</H>
          <H size={13} color="var(--muted)">More accuracy = better offer. Be honest — we re-check at inspection.</H>

          {/* Field groups */}
          {[
            ['Body condition', ['Excellent','Good','Fair','Poor'], 1],
            ['Mechanical', ['Perfect','Minor issues','Needs work'], 0],
            ['Accident history', ['Never','Minor (repaired)','Major'], 0],
            ['Service history', ['Full · dealer','Partial','None'], 1],
            ['Interior wear', ['Like new','Light','Moderate','Heavy'], 1],
          ].map(([label,opts,sel])=>(
            <div key={label} style={{marginTop:18}}>
              <H size={13} weight={700}>{label}</H>
              <div style={{height:8}}/>
              <div style={{display:'flex', gap:8}}>
                {opts.map((o,i)=>(
                  <Box key={o} rough thin p="8px 14px" accent={i===sel?'blue':null}
                    style={{flex:1, textAlign:'center', background:i===sel?'var(--royal-pale)':'#fff'}}>
                    <H size={12} weight={i===sel?700:400} color={i===sel?'var(--royal)':'var(--ink)'}>{o}</H>
                  </Box>
                ))}
              </div>
            </div>
          ))}

          <div style={{height:24}}/>
          <H size={13} weight={700}>Add photos (optional · sharpens the offer)</H>
          <div style={{height:8}}/>
          <Box rough p={20} dashed style={{display:'flex', alignItems:'center', justifyContent:'center', gap:14}}>
            <div style={{width:48, height:48, borderRadius:'50%', border:'1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center'}}>📷</div>
            <div>
              <H size={14} weight={700}>Drop 4 photos here</H>
              <H size={12} color="var(--muted)">Front · rear · sides · interior · or take with your phone</H>
            </div>
          </Box>

          <div style={{height:24}}/>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <Btn>← Specs</Btn>
            <Btn primary big>See my offer →</Btn>
          </div>
        </div>

        {/* Right — live preview */}
        <div style={{padding:'30px 30px', background:'var(--royal)', color:'#fff'}}>
          <H size={11} weight={700} family="ui" color="#fff" style={{letterSpacing:2, opacity:.85}}>INDICATIVE OFFER · UPDATES LIVE</H>
          <div style={{height:6}}/>
          <H family="caveat" size={20} color="#fff">2019 Honda Civic LX</H>
          <H size={12} color="#fff" style={{opacity:.8}}>67,000 km · GCC · Auto · 1 owner</H>

          <div style={{height:24}}/>
          <H size={13} color="#fff" style={{opacity:.75}}>We'll pay you</H>
          <H family="caveat" size={48} color="#fff" weight={700} style={{lineHeight:1}}>KWD 2,650</H>
          <H size={13} color="#fff" style={{opacity:.75}}>– 2,950 depending on inspection</H>

          <div style={{height:14}}/>
          <div style={{height:8, background:'rgba(255,255,255,.2)', borderRadius:4, position:'relative'}}>
            <div style={{position:'absolute', left:'25%', right:'15%', top:0, height:'100%', background:'#fff', borderRadius:4}}/>
          </div>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <H size={11} color="#fff" style={{opacity:.7}}>KWD 2,000</H>
            <H size={11} color="#fff" style={{opacity:.7}}>KWD 3,200</H>
          </div>

          <div style={{height:24}}/>
          <H size={13} weight={700} color="#fff">What happens next?</H>
          <div style={{height:8}}/>
          {[
            'We confirm the offer in writing — valid 7 days',
            'Book a 30-min inspection at any time',
            'After inspection, we transfer the money',
            'We handle MOI ownership transfer',
          ].map((t,i)=>(
            <div key={i} style={{display:'flex', gap:10, marginBottom:6}}>
              <H size={13} color="#fff">{i+1}.</H>
              <H size={13} color="#fff" style={{opacity:.9}}>{t}</H>
            </div>
          ))}

          <div style={{height:20}}/>
          <Box rough p={14} style={{background:'rgba(255,255,255,.15)', borderColor:'rgba(255,255,255,.4)'}}>
            <H size={13} color="#fff" weight={700}>Prefer the marketplace?</H>
            <H size={12} color="#fff" style={{opacity:.85}}>List as a self-service ad — keep 100% of sale price</H>
          </Box>
        </div>
      </div>
      <Annot top={170} right={20} dir="right" w={140}>Live offer reassures · no surprise at the end</Annot>
      <Footer/>
    </Browser>
  );
}

// ── B · Conversational chat-style
function SellChat(){
  const msgs = [
    ['bot','Hi · I\u2019m Aisha, your valuation advisor 👋'],
    ['bot','First — what car do you have?'],
    ['user','2019 Honda Civic LX'],
    ['bot','Nice. Roughly how many km on it?'],
    ['user','About 67,000'],
    ['bot','Got it. Any accidents or major repairs?'],
    ['user','None — full service at the dealer'],
    ['bot','Perfect. One last question — when do you want to sell?'],
  ];
  return (
    <Browser url="behbehanimotors.com.kw / sell-your-car · conversational">
      <NavBar active="Sell a Car"/>
      <div style={{padding:'20px 28px', background:'var(--paper-2)', borderBottom:'1.5px solid var(--ink)'}}>
        <H family="caveat" size={28} weight={700}>Sell your car · just chat</H>
        <H size={13} color="var(--muted)">Answer 5 quick questions and we'll give you a guaranteed offer</H>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 360px', gap:0, minHeight:950}}>
        <div style={{padding:'30px 36px', display:'flex', flexDirection:'column', gap:14, background:'var(--paper)'}}>
          {msgs.map(([from,t],i)=>(
            <div key={i} style={{alignSelf: from==='bot'?'flex-start':'flex-end', maxWidth:'70%', display:'flex', gap:8, alignItems:'flex-start'}}>
              {from==='bot' && <Box rough thin w={32} h={32} fill="royal" style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><H size={14} color="#fff" weight={700}>A</H></Box>}
              <Box rough p="10px 14px" fill={from==='user'?'pale':null}>
                <H size={14}>{t}</H>
              </Box>
            </div>
          ))}

          {/* Active step — quick reply chips */}
          <div style={{alignSelf:'flex-end', display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end'}}>
            {['ASAP','This week','Within a month','Just exploring'].map(o=>(
              <Btn key={o} primary>{o}</Btn>
            ))}
          </div>

          <div style={{flex:1}}/>

          {/* Input */}
          <Box rough p={6} style={{display:'flex', gap:6, background:'#fff', position:'sticky', bottom:0}}>
            <Box rough thin p="6px 10px" style={{flex:1, border:'none'}}><H size={13} color="var(--muted)">Or type your answer…</H></Box>
            <Btn primary>Send</Btn>
          </Box>
        </div>

        {/* Right — running offer */}
        <div style={{padding:'30px 24px', borderLeft:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
          <H size={11} weight={700} family="ui" color="var(--muted)" style={{letterSpacing:2}}>SO FAR WE THINK</H>
          <div style={{height:8}}/>
          <H family="caveat" size={20} weight={700}>2019 Honda Civic LX</H>
          <H size={12} color="var(--muted)">based on 4 of 5 answers</H>
          <div style={{height:18}}/>

          <Box rough p={16} accent="blue-2">
            <H size={11} color="var(--muted)">Indicative offer</H>
            <H family="caveat" size={36} weight={700} color="var(--royal)">KWD 2,650</H>
            <H size={11} color="var(--muted)">± 300 pending inspection</H>
            <div style={{height:10}}/>
            <H size={12} color="var(--royal)" style={{textDecoration:'underline'}}>How we got this →</H>
          </Box>

          <div style={{height:18}}/>
          <H size={12} weight={700}>What we know</H>
          <div style={{display:'flex', flexDirection:'column', gap:4, marginTop:6}}>
            {[
              ['Make/model', '2019 Civic LX'],
              ['Mileage', '67,000 km'],
              ['Accidents', 'None'],
              ['Service', 'Full · dealer'],
              ['Urgency', '…asking'],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
                <H size={12} color="var(--muted)">{k}</H>
                <H size={12} weight={700}>{v}</H>
              </div>
            ))}
          </div>

          <div style={{height:18}}/>
          <H size={11} color="var(--muted)">💬 Reply on WhatsApp</H>
          <H size={11} color="var(--muted)">📞 Or call · 1820 0000</H>
        </div>
      </div>
      <Annot top={70} left="44%" dir="up" color="var(--royal)" w={150}>Lower cognitive load · friendlier · slower</Annot>
      <Footer/>
    </Browser>
  );
}

// ── C · Photo-first AI valuation
function SellPhoto(){
  return (
    <Browser url="behbehanimotors.com.kw / sell-your-car · photo-first">
      <NavBar active="Sell a Car"/>

      <div style={{padding:'40px 28px', borderBottom:'1.5px solid var(--ink)', background:'linear-gradient(135deg, var(--royal-pale) 0%, var(--paper) 100%)'}}>
        <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:30, alignItems:'center'}}>
          <div>
            <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>AI-POWERED VALUATION</H>
            <div style={{height:6}}/>
            <H family="caveat" size={42} weight={700} style={{lineHeight:1.05}}>Snap your car. Get an offer.</H>
            <div style={{height:8}}/>
            <H size={15} color="var(--muted)">Our model reads your plate, VIN and condition cues from photos — most accurate offer in 90 seconds.</H>
          </div>
          <Box rough p={30} dashed style={{textAlign:'center', background:'#fff', minHeight:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10}}>
            <div style={{width:80, height:80, borderRadius:'50%', border:'2px solid var(--royal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32}}>📷</div>
            <H size={16} weight={700}>Drop or upload 4 photos</H>
            <H size={12} color="var(--muted)">Front · rear · side · interior</H>
            <div style={{height:8}}/>
            <Btn primary big>Choose files</Btn>
            <H size={11} color="var(--muted)">— or —</H>
            <H size={13} weight={700} color="var(--royal)">📱 Scan with phone (QR)</H>
          </Box>
        </div>
      </div>

      <div style={{padding:'30px 28px'}}>
        <H family="caveat" size={22} weight={700}>What you'll get</H>
        <div style={{height:14}}/>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
          {[
            ['1. Photos read', 'Plate, VIN, panels, paint, wheels'],
            ['2. Spec auto-filled', 'Year, trim, transmission, mileage'],
            ['3. Condition scored', 'AI flags scratches, dents, tints'],
            ['4. Live offer', 'Guaranteed for 7 days'],
          ].map(([t,d])=>(
            <Box key={t} rough p={14}>
              <H size={13} weight={700}>{t}</H>
              <div style={{height:6}}/>
              <H size={12} color="var(--muted)">{d}</H>
            </Box>
          ))}
        </div>

        <div style={{height:30}}/>
        <H family="caveat" size={22} weight={700}>Already analyzed · sample result</H>
        <div style={{height:10}}/>
        <Box rough p={0} style={{display:'grid', gridTemplateColumns:'1fr 1.4fr', overflow:'hidden'}}>
          <div style={{padding:0, borderRight:'1.5px solid var(--ink)'}}>
            <div style={{position:'relative'}}>
              <Img variant="car" h={240} w="100%" style={{border:'none', borderBottom:'1.5px solid var(--ink)'}}/>
              <div style={{position:'absolute', top:24, left:30, width:60, height:30, border:'2px solid var(--royal)', borderRadius:6}}/>
              <H size={10} family="ui" weight={700} color="var(--royal)" style={{position:'absolute', top:60, left:30, background:'#fff', padding:'1px 4px'}}>plate · 9 12 345</H>
              <div style={{position:'absolute', bottom:40, right:80, width:30, height:30, border:'2px solid #d97706', borderRadius:'50%'}}/>
              <H size={10} family="ui" weight={700} color="#d97706" style={{position:'absolute', bottom:18, right:60, background:'#fff', padding:'1px 4px'}}>scratch flagged</H>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0}}>
              {Array.from({length:3}).map((_,i)=>(
                <div key={i} style={{position:'relative'}}>
                  <Img variant="" h={70} w="100%" style={{borderRadius:0, borderLeft:i===0?'none':'1.5px solid var(--ink)', borderRight:'none', borderTop:'none', borderBottom:'none'}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:20}}>
            <H size={11} weight={700} family="ui" color="var(--muted)" style={{letterSpacing:1.5}}>READ FROM PHOTOS · 96% CONFIDENCE</H>
            <div style={{height:8}}/>
            <H family="caveat" size={24} weight={700}>2019 Honda Civic LX</H>
            <H size={12} color="var(--muted)">Sedan · automatic · pearl white · GCC specs · ~ 65–70K km</H>
            <div style={{height:14}}/>
            <Box rough p={12} accent="blue-2">
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <H size={13} color="var(--muted)">Our offer · 7 days</H>
                <H size={11} color="var(--royal)">edit details ✎</H>
              </div>
              <H family="caveat" size={36} weight={700} color="var(--royal)">KWD 2,650</H>
            </Box>
            <div style={{height:12}}/>
            <Box rough thin p={10}>
              <H size={12} weight={700}>Detected condition notes</H>
              <div style={{height:6}}/>
              <ul style={{margin:0, paddingLeft:20, fontFamily:'Kalam', fontSize:12, color:'var(--muted)', lineHeight:1.6}}>
                <li>Minor scratch · rear quarter (low impact: −80 KWD)</li>
                <li>Tires ~ 60% tread</li>
                <li>Original paint · no respray detected</li>
              </ul>
            </Box>
            <div style={{height:14}}/>
            <div style={{display:'flex', gap:8}}>
              <Btn primary big style={{flex:1, justifyContent:'center'}}>Accept · book inspection</Btn>
              <Btn>List instead</Btn>
            </div>
          </div>
        </Box>
      </div>
      <Annot top={30} right={20} dir="right" w={130}>"Wow" factor · best for tech-forward early adopters</Annot>
      <Footer/>
    </Browser>
  );
}

Object.assign(window, { SellLinear, SellChat, SellPhoto });
