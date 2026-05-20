// wf-fulfillment.jsx — Delivery + Returns variations.

// ── A · Delivery — map dominant
function DeliveryMap(){
  return (
    <Browser url="behbehanimotors.com.kw / account/deliveries/del_8421/track">
      <NavBar active="My Account"/>
      <div style={{padding:'14px 28px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
        <H size={12} color="var(--muted)">My account › Deliveries › Order #8421</H>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', minHeight:880}}>
        {/* Map */}
        <div style={{position:'relative', background:'#e8e5dc', borderRight:'1.5px solid var(--ink)'}}>
          <svg width="100%" height="100%" viewBox="0 0 600 880" preserveAspectRatio="none">
            <rect width="600" height="880" fill="#e8e5dc"/>
            {/* Roads */}
            <path d="M0 200 L600 220" stroke="#c2bdac" strokeWidth="22" fill="none"/>
            <path d="M0 480 L600 500" stroke="#c2bdac" strokeWidth="22" fill="none"/>
            <path d="M150 0 L160 880" stroke="#c2bdac" strokeWidth="22" fill="none"/>
            <path d="M420 0 L430 880" stroke="#c2bdac" strokeWidth="22" fill="none"/>
            <path d="M0 200 L600 220" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="6 6"/>
            <path d="M0 480 L600 500" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="6 6"/>
            <path d="M150 0 L160 880" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="6 6"/>
            <path d="M420 0 L430 880" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="6 6"/>

            {/* Driver route */}
            <path d="M150 750 Q 200 600, 280 500 Q 350 400, 430 320 Q 480 240, 510 180" stroke="var(--royal)" strokeWidth="4" fill="none" strokeLinecap="round"/>

            {/* Origin */}
            <circle cx="150" cy="750" r="14" fill="#fff" stroke="var(--ink)" strokeWidth="2"/>
            <text x="172" y="755" fontSize="13" fontWeight="700" fontFamily="Kalam">Behbehani depot</text>

            {/* Driver position */}
            <circle cx="350" cy="400" r="20" fill="var(--royal)" stroke="#fff" strokeWidth="3"/>
            <text x="376" y="405" fontSize="13" fontWeight="700" fontFamily="Kalam">🚚 Driver · 12 min</text>

            {/* Destination */}
            <path d="M510 165 L502 185 L518 185 Z M510 178 L510 195" stroke="#000" strokeWidth="0" fill="none"/>
            <circle cx="510" cy="180" r="14" fill="var(--royal)" stroke="#fff" strokeWidth="2"/>
            <text x="510" y="184" fontSize="12" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Kalam">★</text>
            <text x="480" y="160" fontSize="13" fontWeight="700" fontFamily="Kalam">Your address</text>
          </svg>

          <div style={{position:'absolute', top:14, right:14, display:'flex', flexDirection:'column', gap:6}}>
            <Box rough thin w={36} h={36} style={{display:'flex',alignItems:'center',justifyContent:'center', background:'#fff'}}><H size={16}>+</H></Box>
            <Box rough thin w={36} h={36} style={{display:'flex',alignItems:'center',justifyContent:'center', background:'#fff'}}><H size={16}>−</H></Box>
            <Box rough thin w={36} h={36} style={{display:'flex',alignItems:'center',justifyContent:'center', background:'#fff'}}><H size={14}>⊙</H></Box>
          </div>

          <Box rough p={12} style={{position:'absolute', bottom:14, left:14, right:14, background:'#fff', display:'flex', gap:14, alignItems:'center'}}>
            <Box rough thin w={48} h={48} fill="royal" style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <H size={14} color="#fff" weight={700}>YA</H>
            </Box>
            <div style={{flex:1}}>
              <H size={13} weight={700}>Yousef Al-Anezi · your driver</H>
              <H size={11} color="var(--muted)">★ 4.9 · 320 deliveries · plate ARD 12-3</H>
            </div>
            <Btn icon>☎</Btn>
            <Btn icon>💬</Btn>
          </Box>
        </div>

        {/* Status / timeline */}
        <div style={{padding:'24px 28px'}}>
          <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>ARRIVING IN</H>
          <H family="caveat" size={64} weight={700} color="var(--royal)" style={{lineHeight:1}}>12 min</H>
          <H size={13} color="var(--muted)">Estimated 14:32 · 4.8 km away</H>

          <div style={{height:20}}/>

          <Box rough p={12}>
            <div style={{display:'flex', gap:12, alignItems:'center'}}>
              <Img variant="car" h={70} w={110}/>
              <div>
                <H size={14} weight={700}>2022 Toyota Camry GLX</H>
                <H size={11} color="var(--muted)">Order #8421 · KWD 6,750</H>
              </div>
            </div>
          </Box>

          <div style={{height:20}}/>
          <H size={13} weight={700}>Today's progress</H>
          <div style={{height:8}}/>
          {[
            ['09:14','Scheduled · 14:00 – 16:00','done'],
            ['11:02','Loaded at depot','done'],
            ['12:30','In final inspection','done'],
            ['14:08','Out for delivery · live','active'],
            ['~14:32','Arrives at your address','todo'],
            ['','Handover · digital checklist','todo'],
          ].map(([t,l,st],i)=>(
            <div key={i} style={{display:'flex', gap:12, padding:'8px 0', borderBottom:i<5?'1px dashed var(--light)':'none'}}>
              <div style={{width:48, fontFamily:'Kalam', fontSize:11, color:'var(--muted)'}}>{t}</div>
              <Box rough thin w={12} h={12} fill={st==='done'?'ink':st==='active'?'royal':null}
                style={{borderRadius:'50%', marginTop:4, flexShrink:0}}/>
              <H size={13} weight={st==='active'?700:400} color={st==='todo'?'var(--muted)':'var(--ink)'}>{l}</H>
            </div>
          ))}

          <div style={{height:20}}/>
          <Box rough p={14} accent="blue-2">
            <H size={12} weight={700} color="var(--royal)">📋 Handover checklist (ready)</H>
            <H size={11} color="var(--muted)">Vehicle inspection, accessories, keys (×2), MOI papers — driver will run through it with you on arrival.</H>
          </Box>
          <div style={{height:8}}/>
          <H size={12} color="var(--royal)" style={{textDecoration:'underline'}}>Reschedule · change address</H>
        </div>
      </div>
      <Annot top={120} left="42%" dir="up" color="var(--royal)" w={150}>Map gives confidence · live position is the wow</Annot>
      <Footer/>
    </Browser>
  );
}

// ── B · Delivery — mobile
function DeliveryMobile(){
  return (
    <Phone>
      {/* Map top */}
      <div style={{position:'relative', height:280, background:'#e8e5dc', borderBottom:'1.5px solid var(--ink)'}}>
        <svg width="100%" height="100%" viewBox="0 0 400 280" preserveAspectRatio="none">
          <rect width="400" height="280" fill="#e8e5dc"/>
          <path d="M0 60 L400 80" stroke="#c2bdac" strokeWidth="16" fill="none"/>
          <path d="M0 180 L400 200" stroke="#c2bdac" strokeWidth="16" fill="none"/>
          <path d="M100 0 L110 280" stroke="#c2bdac" strokeWidth="16" fill="none"/>
          <path d="M280 0 L290 280" stroke="#c2bdac" strokeWidth="16" fill="none"/>
          <path d="M100 240 Q 160 170, 220 140 Q 280 110, 320 70" stroke="var(--royal)" strokeWidth="4" fill="none"/>
          <circle cx="100" cy="240" r="10" fill="#fff" stroke="var(--ink)" strokeWidth="2"/>
          <circle cx="220" cy="140" r="14" fill="var(--royal)" stroke="#fff" strokeWidth="2.5"/>
          <circle cx="320" cy="70" r="10" fill="var(--royal)" stroke="#fff" strokeWidth="2"/>
        </svg>
        <Box rough thin p="4px 10px" style={{position:'absolute', top:10, left:10, background:'#fff'}}><H size={11} weight={700}>← Back</H></Box>
      </div>

      <div style={{padding:'14px 16px'}}>
        <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>ARRIVES IN</H>
        <H family="caveat" size={48} weight={700} color="var(--royal)" style={{lineHeight:1}}>12 min</H>
        <H size={11} color="var(--muted)">~ 14:32 · 4.8 km away</H>

        <div style={{height:14}}/>
        <Box rough p={10} style={{display:'flex', gap:10, alignItems:'center'}}>
          <Box rough thin w={36} h={36} fill="royal" style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <H size={11} color="#fff" weight={700}>YA</H>
          </Box>
          <div style={{flex:1}}>
            <H size={12} weight={700}>Yousef · driver</H>
            <H size={10} color="var(--muted)">★ 4.9 · plate ARD 12-3</H>
          </div>
          <Btn icon>☎</Btn>
          <Btn icon>💬</Btn>
        </Box>

        <div style={{height:14}}/>
        <Box rough p={10}>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <Img variant="car" h={50} w={80}/>
            <div>
              <H size={12} weight={700}>2022 Camry GLX</H>
              <H size={10} color="var(--muted)">Order #8421</H>
            </div>
          </div>
        </Box>

        <div style={{height:14}}/>
        <H size={12} weight={700}>Today's progress</H>
        <div style={{height:6}}/>
        {[
          ['Scheduled','done'],
          ['Loaded at depot','done'],
          ['Final inspection','done'],
          ['Out for delivery · LIVE','active'],
          ['Arrives at address','todo'],
          ['Handover checklist','todo'],
        ].map(([l,st],i,arr)=>(
          <div key={i} style={{display:'flex', gap:8, padding:'5px 0'}}>
            <Box rough thin w={10} h={10} fill={st==='done'?'ink':st==='active'?'royal':null} style={{borderRadius:'50%', marginTop:4, flexShrink:0}}/>
            <H size={12} weight={st==='active'?700:400} color={st==='todo'?'var(--muted)':'var(--ink)'}>{l}</H>
          </div>
        ))}
      </div>

      <div style={{position:'sticky', bottom:0, padding:'10px 16px', background:'var(--paper)', borderTop:'1.5px solid var(--ink)'}}>
        <Btn primary big style={{width:'100%', justifyContent:'center'}}>Open handover checklist</Btn>
      </div>
    </Phone>
  );
}

// ── C · Returns — initiate
function ReturnsInitiate(){
  return (
    <Browser url="behbehanimotors.com.kw / account/returns/new?orderId=8421">
      <NavBar active="My Account"/>
      <div style={{padding:'14px 28px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
        <H size={12} color="var(--muted)">My account › Returns › New</H>
      </div>

      <div style={{padding:'30px 28px'}}>
        <Box rough p={20} accent="blue-2" style={{display:'flex', gap:20, alignItems:'center'}}>
          <Box rough w={64} h={64} fill="royal" style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, color:'#fff'}}>↩</Box>
          <div>
            <H family="caveat" size={28} weight={700} color="var(--royal)">3-day / 300 km money-back guarantee</H>
            <H size={13} color="var(--muted)">If you change your mind, we collect the car at no charge. Full refund minus any damage or excess mileage.</H>
          </div>
        </Box>

        <div style={{height:24}}/>
        <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:30}}>
          <div>
            <H family="caveat" size={24} weight={700}>Your eligibility · ✓ approved</H>
            <div style={{height:12}}/>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10}}>
              {[
                ['Time since delivery', '1 day 6 hrs', 'of 3 days', true],
                ['Mileage driven', '84 km', 'of 300 km', true],
                ['Condition', 'No damage logged', '', true],
              ].map(([k,v,sub,ok])=>(
                <Box key={k} rough thin p={12}>
                  <H size={11} color="var(--muted)">{k}</H>
                  <H size={18} weight={700} color={ok?'var(--royal)':'var(--ink)'}>{v}</H>
                  <H size={11} color="var(--muted)">{sub}</H>
                </Box>
              ))}
            </div>

            <div style={{height:22}}/>
            <H size={13} weight={700}>Why are you returning?</H>
            <H size={11} color="var(--muted)">Helps us improve · doesn't affect your refund</H>
            <div style={{height:8}}/>
            <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8}}>
              {['Found a better deal','Doesn\'t suit my needs','Mechanical concern','Cosmetic issue','Changed plans','Other'].map((r,i)=>(
                <Box key={r} rough thin p="10px 12px" accent={i===1?'blue':null} style={{display:'flex', alignItems:'center', gap:8, background: i===1?'var(--royal-pale)':'#fff'}}>
                  <Box rough thin w={14} h={14} fill={i===1?'royal':null} style={{borderRadius:'50%', flexShrink:0}}/>
                  <H size={12}>{r}</H>
                </Box>
              ))}
            </div>

            <div style={{height:18}}/>
            <H size={13} weight={700}>Tell us more (optional)</H>
            <Box rough thin p={10} style={{height:90, background:'#fff'}}>
              <H size={12} color="var(--muted)">e.g. The seats are a bit tighter than I expected for a long-haul commute…</H>
            </Box>

            <div style={{height:18}}/>
            <H size={13} weight={700}>When can we pick it up?</H>
            <div style={{height:8}}/>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8}}>
              {['Tomorrow · 10–12','Tomorrow · 14–16','Thu · 10–12','Thu · 14–16'].map((s,i)=>(
                <Box key={s} rough thin p="10px 8px" accent={i===0?'blue':null} style={{textAlign:'center', background: i===0?'var(--royal-pale)':'#fff'}}>
                  <H size={11} weight={i===0?700:400}>{s}</H>
                </Box>
              ))}
            </div>
            <H size={11} color="var(--royal)" style={{textDecoration:'underline', marginTop:6}}>Or drop off at our facility ↗</H>

            <div style={{height:22}}/>
            <Btn primary big>Request pickup & start refund →</Btn>
          </div>

          <div>
            <H family="caveat" size={20} weight={700}>Refund summary</H>
            <div style={{height:10}}/>
            <Box rough p={14}>
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}>
                <H size={12} color="var(--muted)">Vehicle paid</H>
                <H size={12} weight={700}>KWD 6,750.000</H>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}>
                <H size={12} color="var(--muted)">Add-ons (warranty)</H>
                <H size={12} weight={700}>KWD 150.000</H>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', color:'var(--muted)'}}>
                <H size={12} color="var(--muted)">Excess mileage</H>
                <H size={12}>– KWD 0</H>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', color:'var(--muted)'}}>
                <H size={12} color="var(--muted)">Damage</H>
                <H size={12}>– KWD 0</H>
              </div>
              <div style={{borderTop:'1px dashed var(--light)', margin:'8px 0'}}/>
              <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0'}}>
                <H size={13} weight={700}>Estimated refund</H>
                <H size={18} weight={700} color="var(--royal)">KWD 6,900</H>
              </div>
              <H size={11} color="var(--muted)">Refunded to the same KNET account · 5–7 business days</H>
            </Box>
            <div style={{height:14}}/>
            <Box rough p={12} thin>
              <H size={12} weight={700}>What happens next</H>
              <div style={{height:6}}/>
              <ul style={{margin:0, paddingLeft:20, fontFamily:'Kalam', fontSize:12, color:'var(--muted)', lineHeight:1.7}}>
                <li>Our driver collects the car</li>
                <li>We inspect it (mileage & condition)</li>
                <li>Any deductions confirmed with you</li>
                <li>Refund processed</li>
              </ul>
            </Box>
          </div>
        </div>
      </div>
      <Annot top={70} right={20} dir="right" w={150}>Lead with eligibility — never make the user fear they'll be denied</Annot>
      <Footer/>
    </Browser>
  );
}

// ── D · Returns — track refund
function ReturnsTrack(){
  return (
    <Browser url="behbehanimotors.com.kw / account/returns/ret_8421">
      <NavBar active="My Account"/>
      <div style={{padding:'14px 28px', borderBottom:'1.5px solid var(--ink)', background:'var(--paper-2)'}}>
        <H size={12} color="var(--muted)">My account › Returns › #RET-8421</H>
      </div>

      <div style={{padding:'30px 28px'}}>
        <div style={{display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:30}}>
          <div>
            <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:2}}>RETURN #RET-8421 · IN PROGRESS</H>
            <H family="caveat" size={32} weight={700}>Refund of KWD 6,900 · expected by Tue</H>
            <H size={13} color="var(--muted)">2022 Toyota Camry GLX · returned 27 May</H>

            <div style={{height:24}}/>
            <Box rough p={20}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <H size={13} weight={700}>Progress</H>
                <H size={12} color="var(--royal)">4 of 6 steps</H>
              </div>
              <div style={{height:14}}/>
              {[
                ['Return requested','27 May · 14:02','done', 'Pickup scheduled tomorrow 10–12'],
                ['Picked up','28 May · 10:14','done', 'By driver Mohammed · plate ARG 71-2'],
                ['Inspected','28 May · 13:30','done', 'No damage · 84 km extra · KWD 0 deduction'],
                ['Refund approved','28 May · 17:00','done', 'Full refund of KWD 6,900 confirmed'],
                ['Refund sent','expected 30 May','active', 'To KNET ending ••42 · 1 business day'],
                ['Closed','expected 30 May','todo', 'Receipt sent by email'],
              ].map(([t,d,st,note],i,arr)=>(
                <div key={i} style={{display:'flex', gap:14, padding:'10px 0', borderBottom:i<arr.length-1?'1px dashed var(--light)':'none'}}>
                  <Box rough thin w={32} h={32} fill={st==='done'?'ink':st==='active'?'royal':null}
                    style={{borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    <H size={12} weight={700} color={st==='todo'?'var(--muted)':'#fff'}>{st==='done'?'✓':i+1}</H>
                  </Box>
                  <div style={{flex:1}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <H size={14} weight={700} color={st==='todo'?'var(--muted)':'var(--ink)'}>{t}</H>
                      <H size={11} color="var(--muted)">{d}</H>
                    </div>
                    <H size={12} color="var(--muted)">{note}</H>
                  </div>
                </div>
              ))}
            </Box>
          </div>

          <div>
            <Box rough p={18} accent="blue-2">
              <H size={11} weight={700} family="ui" color="var(--royal)" style={{letterSpacing:1.5}}>REFUND</H>
              <H family="caveat" size={40} weight={700} color="var(--royal)">KWD 6,900.000</H>
              <H size={12} color="var(--muted)">To KNET ending ••42</H>
              <div style={{height:10}}/>
              <div style={{height:8, background:'#fff', border:'1.5px solid var(--ink)', borderRadius:4, position:'relative'}}>
                <div style={{position:'absolute', left:0, width:'80%', top:-1.5, bottom:-1.5, background:'var(--royal)', borderRadius:3}}/>
              </div>
              <H size={11} color="var(--muted)" style={{marginTop:4}}>80% complete · ETA 30 May</H>
            </Box>

            <div style={{height:14}}/>
            <H size={13} weight={700}>Returned car</H>
            <div style={{height:8}}/>
            <Box rough p={0} style={{overflow:'hidden'}}>
              <Img variant="car" h={120} w="100%"/>
              <div style={{padding:12}}>
                <H size={13} weight={700}>2022 Toyota Camry GLX</H>
                <H size={11} color="var(--muted)">Order #8421 · 84 km driven</H>
              </div>
            </Box>

            <div style={{height:14}}/>
            <H size={13} weight={700}>Need help?</H>
            <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:6}}>
              <H size={12} color="var(--royal)" style={{textDecoration:'underline'}}>💬 Chat with refund team</H>
              <H size={12} color="var(--royal)" style={{textDecoration:'underline'}}>☎ 1820 0000</H>
              <H size={12} color="var(--royal)" style={{textDecoration:'underline'}}>📄 Download receipt (when ready)</H>
            </div>
          </div>
        </div>
      </div>
      <Annot top={130} right={20} dir="right" w={140}>Refund tracker should feel like watching a package · positive momentum</Annot>
      <Footer/>
    </Browser>
  );
}

Object.assign(window, { DeliveryMap, DeliveryMobile, ReturnsInitiate, ReturnsTrack });
