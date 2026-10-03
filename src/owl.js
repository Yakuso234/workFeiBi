// Original code-native vector character. No downloaded character or image assets.
// Body pieces are separate SVG geometry so the head, lids, wings and feet move
// independently. The rear shell is a different drawing, not a mirrored front.
(function(scope){
  let serial=0;
  const poses=new Set(['idle','blink','wave','kick','stretch','look','sleep','turn','angry','sway','happy','hop','lifted']);
  const palettes=new Set(['classic','neon','moon']);
  const accessories=new Set(['none','star','headphones']);
  function create(container){
    if(!container)throw new Error('缺少小鸮的显示容器');
    const uid=`owl-${++serial}`;
    container.innerHTML=`<svg class="clockwork-owl" viewBox="0 0 500 500" role="img" aria-label="原创角色：发条鸮" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${uid}-shell" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="var(--owl-shell-light, #fff1c4)"/><stop offset=".55" stop-color="var(--owl-shell-mid, #edc277)"/><stop offset="1" stop-color="var(--owl-shell-dark, #c18a42)"/></linearGradient>
        <linearGradient id="${uid}-teal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--owl-accent-light, #77d3c8)"/><stop offset="1" stop-color="var(--owl-accent-dark, #267e83)"/></linearGradient>
        <radialGradient id="${uid}-cream" cx=".45" cy=".3" r=".7"><stop stop-color="var(--owl-cream-light, #fffef0)"/><stop offset="1" stop-color="var(--owl-cream-dark, #f3dfa7)"/></radialGradient>
      </defs>
      <ellipse class="owl-shadow" cx="250" cy="457" rx="109" ry="13" fill="#133d46" opacity=".17"/>
      <g class="owl-body" stroke="var(--owl-outline, #644b35)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <g class="owl-feet">
          <g class="owl-foot owl-foot-left"><path data-owl-solid d="M191 411 L188 437 Q169 435 166 449 Q179 455 193 450 Q207 457 218 449 L217 416Z" fill="var(--owl-metal, #e9b659)"/><path d="M192 437 L193 450 M206 438 L207 451" fill="none" stroke-width="3"/></g>
          <g class="owl-foot owl-foot-right"><path data-owl-solid d="M283 416 L282 449 Q293 457 307 450 Q321 455 334 449 Q331 435 312 437 L309 411Z" fill="var(--owl-metal, #e9b659)"/><path d="M307 437 L307 450 M294 438 L293 451" fill="none" stroke-width="3"/></g>
        </g>
        <g class="owl-wing owl-wing-left"><path data-owl-solid d="M145 267 Q111 268 94 314 Q84 350 110 390 Q142 383 157 350 Q168 310 145 267Z" fill="url(#${uid}-shell)"/><path d="M139 300 Q120 326 114 359 M122 313 Q109 336 108 345" fill="none" stroke="var(--owl-rim, #b9823f)" stroke-width="4"/><circle cx="139" cy="287" r="13" fill="url(#${uid}-teal)" stroke-width="4"/><circle cx="139" cy="287" r="4" fill="var(--owl-metal-light, #f7d27d)" stroke="none"/></g>
        <g class="owl-wing owl-wing-right"><path data-owl-solid d="M355 267 Q389 268 406 314 Q416 350 390 390 Q358 383 343 350 Q332 310 355 267Z" fill="url(#${uid}-shell)"/><path d="M361 300 Q380 326 386 359 M378 313 Q391 336 392 345" fill="none" stroke="var(--owl-rim, #b9823f)" stroke-width="4"/><circle cx="361" cy="287" r="13" fill="url(#${uid}-teal)" stroke-width="4"/><circle cx="361" cy="287" r="4" fill="var(--owl-metal-light, #f7d27d)" stroke="none"/></g>
        <g class="owl-front">
          <path data-owl-solid d="M158 252 Q120 298 142 371 Q161 427 250 434 Q339 427 358 371 Q380 298 342 252Z" fill="url(#${uid}-shell)"/>
          <path data-owl-solid d="M188 285 Q153 329 176 377 Q199 409 250 412 Q301 409 324 377 Q347 329 312 285Z" fill="url(#${uid}-cream)" stroke="var(--owl-rim, #b78b48)" stroke-width="3"/>
          <path d="M209 301 Q250 324 291 301 L281 333 L250 325 L219 333Z" fill="url(#${uid}-teal)" stroke-width="3"/>
          <circle cx="250" cy="355" r="30" fill="var(--owl-metal, #edc276)" stroke-width="4"/><circle cx="250" cy="355" r="23" fill="var(--owl-cream-light, #fffcdf)" stroke="var(--owl-rim, #ba8b4d)" stroke-width="2"/>
          <path class="owl-clock-hand" d="M250 336 L250 355 L263 364" stroke="var(--owl-accent-dark, #287d83)" stroke-width="4" fill="none"/><circle cx="250" cy="355" r="4" fill="var(--owl-outline, #644b35)" stroke="none"/>
          <g fill="var(--owl-rim, #a67b45)" stroke="none"><circle cx="250" cy="336" r="2"/><circle cx="269" cy="355" r="2"/><circle cx="250" cy="374" r="2"/><circle cx="231" cy="355" r="2"/></g>
        </g>
        <g class="owl-back">
          <path data-owl-solid d="M158 252 Q120 298 142 371 Q161 427 250 434 Q339 427 358 371 Q380 298 342 252Z" fill="url(#${uid}-shell)"/>
          <path d="M179 291 Q250 267 321 291 L313 385 Q250 419 187 385Z" fill="var(--owl-rear-panel, #bd975e)" stroke-width="4"/>
          <path d="M195 292 Q250 278 305 292 M200 307 L223 299 M277 299 L300 307" fill="none" stroke="var(--owl-metal-light, #f5ddac)" stroke-width="3"/>
          <g fill="var(--owl-outline, #74583b)" stroke="none"><circle cx="188" cy="300" r="5"/><circle cx="311" cy="300" r="5"/><circle cx="199" cy="382" r="5"/><circle cx="301" cy="382" r="5"/></g>
          <circle cx="250" cy="344" r="25" fill="var(--owl-metal, #e6bf76)" stroke-width="4"/><circle cx="250" cy="344" r="12" fill="var(--owl-accent-dark, #377f82)" stroke-width="3"/>
          <g class="owl-winding-key" fill="var(--owl-metal-light, #ffdfa0)" stroke-width="4"><path data-owl-solid d="M245 344 L241 324 Q212 323 217 302 Q221 291 233 298 L250 313 L267 298 Q279 291 283 302 Q288 323 259 324 L255 344Z"/><path d="M229 307 L237 314 M271 307 L263 314" fill="none"/></g>
          <path data-owl-solid d="M224 408 L250 453 L276 408" fill="url(#${uid}-teal)" stroke-width="4"/><path d="M250 415 L250 438" fill="none" stroke="var(--owl-accent-light, #9ddbcf)" stroke-width="3"/>
        </g>
        <g class="owl-head">
          <path data-owl-solid d="M121 188 Q111 147 137 102 L189 119 Q250 93 311 119 L363 102 Q389 147 379 188 Q397 249 351 277 Q311 302 250 304 Q189 302 149 277 Q103 249 121 188Z" fill="url(#${uid}-shell)"/>
          <path d="M142 117 L151 150 L179 127 M358 117 L349 150 L321 127" fill="var(--owl-accent-mid, #53a9a5)" stroke-width="3"/>
          <g class="owl-front">
            <path d="M132 204 Q132 146 187 146 Q226 141 250 164 Q274 141 313 146 Q368 146 368 204 Q368 256 310 269 Q278 278 250 255 Q222 278 190 269 Q132 256 132 204Z" fill="url(#${uid}-cream)" stroke="var(--owl-rim, #b69255)" stroke-width="3"/>
            <ellipse cx="191" cy="205" rx="45" ry="51" fill="var(--owl-eye-shell, #f6eccb)" stroke="var(--owl-rim, #c2a065)" stroke-width="3"/><ellipse cx="309" cy="205" rx="45" ry="51" fill="var(--owl-eye-shell, #f6eccb)" stroke="var(--owl-rim, #c2a065)" stroke-width="3"/>
            <g class="owl-eye owl-eye-left"><g class="owl-eye-open"><ellipse cx="194" cy="211" rx="26" ry="36" fill="var(--owl-iris, #22636a)" stroke="var(--owl-eye-outline, #294d4d)" stroke-width="3"/><ellipse cx="197" cy="218" rx="17" ry="24" fill="var(--owl-pupil, #183e4a)" stroke="none"/><ellipse cx="188" cy="196" rx="9" ry="12" fill="#fffef4" stroke="none"/><circle cx="204" cy="224" r="4" fill="var(--owl-eye-glint, #a9e9df)" stroke="none"/></g><path class="owl-eye-closed" d="M169 215 Q191 231 215 215" fill="none" stroke="var(--owl-eye-outline, #294d4d)" stroke-width="6"/></g>
            <g class="owl-eye owl-eye-right"><g class="owl-eye-open"><ellipse cx="306" cy="211" rx="26" ry="36" fill="var(--owl-iris, #22636a)" stroke="var(--owl-eye-outline, #294d4d)" stroke-width="3"/><ellipse cx="303" cy="218" rx="17" ry="24" fill="var(--owl-pupil, #183e4a)" stroke="none"/><ellipse cx="300" cy="196" rx="9" ry="12" fill="#fffef4" stroke="none"/><circle cx="316" cy="224" r="4" fill="var(--owl-eye-glint, #a9e9df)" stroke="none"/></g><path class="owl-eye-closed" d="M285 215 Q309 231 331 215" fill="none" stroke="var(--owl-eye-outline, #294d4d)" stroke-width="6"/></g>
            <g class="owl-brows" stroke="var(--owl-outline, #644b35)" stroke-width="7"><path d="M161 170 L211 185 M289 185 L339 170"/></g>
            <g class="owl-cheeks" stroke="none" fill="#ea9b85" opacity=".7"><ellipse cx="154" cy="248" rx="15" ry="8"/><ellipse cx="346" cy="248" rx="15" ry="8"/></g>
            <path data-owl-solid class="owl-beak" d="M238 230 Q250 222 262 230 L250 250Z" fill="var(--owl-metal, #e8a749)" stroke-width="3"/>
            <path d="M238 275 Q250 282 262 275" fill="none" stroke="var(--owl-rim, #c29354)" stroke-width="3"/>
          </g>
          <g class="owl-back">
            <path d="M145 184 Q250 138 355 184 M139 210 Q250 163 361 210 M150 238 Q250 195 350 238 M177 266 Q250 235 323 266" fill="none" stroke="var(--owl-rim, #b3884b)" stroke-width="4"/>
            <path d="M250 125 L250 273" fill="none" stroke="var(--owl-metal-light, #fff0be)" stroke-width="3"/>
            <circle cx="250" cy="178" r="10" fill="var(--owl-accent-mid, #57a6a0)" stroke-width="3"/>
          </g>
          <path d="M241 121 L250 113 L259 121 L250 131Z" fill="var(--owl-accent-mid, #4faaa5)" stroke-width="2"/>
          <path d="M164 117 Q250 80 336 117" fill="none" stroke="#fff7d4" stroke-width="5" opacity=".7"/>
          <g class="owl-accessory" data-owl-accessory="star">
            <path data-owl-solid d="M331 74 L342 95 L366 99 L349 116 L352 140 L331 128 L309 140 L313 116 L295 99 L320 95Z" fill="var(--owl-metal-light, #ffdfa0)" stroke-width="4"/>
            <path class="owl-front" d="M327 92 L323 104 L311 107 M343 116 L344 126" fill="none" stroke="#fffef4" stroke-width="3"/>
            <path class="owl-back" d="M317 112 L344 112" fill="none" stroke="var(--owl-rim, #c2a065)" stroke-width="5"/>
          </g>
          <g class="owl-accessory" data-owl-accessory="headphones">
            <path data-owl-solid d="M122 197 L114 193 Q98 114 157 85 Q250 38 343 85 Q402 114 386 193 L378 197 L371 188 Q384 125 337 99 Q250 57 163 99 Q116 125 129 188Z" fill="var(--owl-headband, #377f82)" stroke-width="5"/>
            <path d="M137 126 Q149 104 169 96 Q250 58 331 96 Q351 104 363 126" fill="none" stroke="var(--owl-accent-light, #77d3c8)" stroke-width="4"/>
            <rect data-owl-solid x="99" y="173" width="35" height="75" rx="14" fill="var(--owl-headband, #377f82)" stroke-width="5"/>
            <rect data-owl-solid x="366" y="173" width="35" height="75" rx="14" fill="var(--owl-headband, #377f82)" stroke-width="5"/>
            <path d="M113 190 L113 230 M387 190 L387 230" fill="none" stroke="var(--owl-metal-light, #ffdfa0)" stroke-width="5"/>
          </g>
        </g>
      </g>
    </svg>`;
    const svg=container.querySelector('svg');
    let current='';
    function setAppearance(appearance={}){
      const candidate=appearance&&typeof appearance==='object'?appearance:{};
      svg.dataset.palette=palettes.has(candidate.palette)?candidate.palette:'classic';
      svg.dataset.accessory=accessories.has(candidate.accessory)?candidate.accessory:'none';
    }
    function setPose(name='',reducedMotion=false){
      const selected=poses.has(name)?name:'still',key=`${selected}:${Boolean(reducedMotion)}`;
      if(key===current)return;
      current=key;svg.setAttribute('class',`clockwork-owl pose-${selected}${reducedMotion?' owl-reduced':''}`);
      svg.dataset.pose=selected;svg.dataset.facing=selected==='turn'?'back':'front';
    }
    function hitTest(x,y){
      if(container.hidden||!svg.isConnected||!Number.isFinite(x)||!Number.isFinite(y))return false;
      // Use transformed SVG geometry, including animated wings/feet. A bounding
      // rectangle would intercept empty desktop space around the small body.
      const back=svg.dataset.facing==='back';
      for(const shape of svg.querySelectorAll('[data-owl-solid]')){
        if(shape.closest(back?'.owl-front':'.owl-back'))continue;
        const accessory=shape.closest('[data-owl-accessory]');
        if(accessory&&accessory.dataset.owlAccessory!==svg.dataset.accessory)continue;
        const matrix=shape.getScreenCTM();
        if(!matrix)continue;
        try{
          const point=new DOMPoint(x,y).matrixTransform(matrix.inverse());
          if(shape.isPointInFill(point)||shape.isPointInStroke(point))return true;
        }catch{/* A detached or zero-size SVG cannot capture the pointer. */}
      }
      return false;
    }
    setAppearance();setPose();
    return {svg,setPose,setAppearance,hitTest,destroy(){container.replaceChildren();}};
  }
  scope.ClockworkOwl=Object.freeze({create});
})(window);
