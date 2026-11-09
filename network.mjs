const NS='http://www.w3.org/2000/svg';
const colors={focus:['#0599f5','#004ca9','#83e6ff'],prerequisite:['#ffd39a','#e69a51','#ffe1b7'],successor:['#7cebf4','#20a9c5','#a2f4ff'],topic:['#d3b1f4','#8b6cbd','#e7ceff']};
function el(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;}
function hash(str){let n=2166136261;for(const c of str)n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0)/4294967295;}
export class NetworkView{
  constructor(svg,onSelect,tooltip){
    this.svg=svg;this.onSelect=onSelect;this.tooltip=tooltip;this.zoom=1;this.pan={x:0,y:0};
    svg.addEventListener('wheel',e=>{e.preventDefault();this.scale(e.deltaY<0?1.12:1/1.12);},{passive:false});
    svg.addEventListener('pointerdown',e=>this.down(e));
    svg.addEventListener('pointermove',e=>this.move(e));
    svg.addEventListener('pointerup',e=>this.up(e));
    svg.addEventListener('pointercancel',()=>{this.drag=null;});
    svg.addEventListener('keydown',e=>{const id=e.target.closest('[data-node]')?.dataset.node;if(id&&(e.key==='Enter'||e.key===' ')){e.preventDefault();this.onSelect(this.nodeById.get(Number(id)).key);}});
  }
  render(data){
    this.data=data;this.w=Math.max(this.svg.clientWidth,300);this.h=Math.max(this.svg.clientHeight,300);
    this.svg.setAttribute('viewBox',`0 0 ${this.w} ${this.h}`);
    this.svg.replaceChildren();
    const defs=el('defs');
    for(const [id,color]of[['arrow','#6acbdf'],['topic-arrow','#b6a2dc']]){const marker=el('marker',{id,'viewBox':'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});marker.append(el('path',{d:'M 0 1 L 9 5 L 0 9 z',fill:color}));defs.append(marker);}
    for(const [role,[light,dark]]of Object.entries(colors)){const gradient=el('radialGradient',{id:`node-${role}`,cx:'32%',cy:'23%',r:'85%'});gradient.append(el('stop',{offset:'0%','stop-color':light}),el('stop',{offset:'100%','stop-color':dark}));defs.append(gradient);}
    this.svg.append(defs);this.group=el('g');this.svg.append(this.group);
    const usableH=this.h-90;
    const bidirectional=data.nodes.some(n=>n.role==='prerequisite')&&data.nodes.some(n=>n.role==='successor');
    this.nodes=data.nodes.map(n=>({...n,x:this.w*(n.role==='focus'?.5:n.role==='topic'?.2:bidirectional?(n.role==='prerequisite'?.3:.7):.5)+(hash(n.key)-.5)*this.w*.6,y:n.role==='focus'?this.h*.49:45+hash(n.key+'y')*usableH,vx:0,vy:0,r:n.role==='focus'?21:n.role==='topic'?7:n.depth===1?13:9}));
    this.nodeById=new Map(this.nodes.map(n=>[n.id,n]));
    this.edges=data.edges.map(e=>({...e,a:this.nodeById.get(e.from),b:this.nodeById.get(e.to)}));
    // Deterministic, bounded force layout; only the selected neighborhood is laid out.
    for(let iter=0;iter<260;iter++){
      const alpha=1-iter/320;
      for(let i=0;i<this.nodes.length;i++)for(let j=i+1;j<this.nodes.length;j++){
        const a=this.nodes[i],b=this.nodes[j];let dx=b.x-a.x,dy=b.y-a.y;
        if(Math.abs(dx)+Math.abs(dy)<.01){dx=.1;dy=.1;}
        const d2=dx*dx+dy*dy,d=Math.sqrt(d2),f=Math.min(6,1800/Math.max(d2,25))*alpha;
        a.vx-=dx/d*f;b.vx+=dx/d*f;a.vy-=dy/d*f;b.vy+=dy/d*f;
        const labelGap=Math.abs(dx)<100&&Math.abs(dy)<55;
        if(labelGap){const sep=(55-Math.abs(dy))*.14*alpha;const sign=dy>=0?1:-1;a.vy-=sep*sign;b.vy+=sep*sign;}
      }
      for(const e of this.edges){const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,d=Math.max(Math.hypot(dx,dy),1),desired=e.type==='REFINES'?100:120;const force=(d-desired)*.009*alpha;e.a.vx+=dx/d*force;e.b.vx-=dx/d*force;e.a.vy+=dy/d*force;e.b.vy-=dy/d*force;}
      for(const n of this.nodes){
        const tx=this.w*(n.role==='focus'?.49:n.role==='topic'?.2:bidirectional?(n.role==='prerequisite'?.27:.73):.53);
        n.vx+=(tx-n.x)*.007*alpha;n.vy+=(this.h*.48-n.y)*.004*alpha;
        if(n.role==='focus'){n.vx+=(this.w*.49-n.x)*.12;n.vy+=(this.h*.48-n.y)*.12;}
        n.x+=n.vx*=.65;n.y+=n.vy*=.65;
        n.x=Math.max(65,Math.min(this.w-65,n.x));n.y=Math.max(55,Math.min(this.h-65,n.y));
      }
    }
    // Resolve label boxes as well as circles: Chinese concept names need more room.
    const box=n=>{const max=n.role==='focus'?12:10,len=Array.from(n.name).length;return{w:Math.min(max,len)*(n.role==='focus'?15:12)+12,h:n.r*2+27+(len>max?14:0),cy:n.y+13+(len>max?7:0)};};
    for(let pass=0;pass<65;pass++){
      for(let i=0;i<this.nodes.length;i++)for(let j=i+1;j<this.nodes.length;j++){
        const a=this.nodes[i],b=this.nodes[j],ra=box(a),rb=box(b),dx=b.x-a.x,dy=rb.cy-ra.cy;
        const ox=(ra.w+rb.w)/2-Math.abs(dx),oy=(ra.h+rb.h)/2-Math.abs(dy);
        if(ox<=0||oy<=0)continue;
        const aMove=a.role==='focus'?0:b.role==='focus'?1:.5,bMove=b.role==='focus'?0:a.role==='focus'?1:.5;
        if(ox<oy){const push=Math.min(ox+1,12)*.6*(dx>=0?1:-1);a.x-=push*aMove;b.x+=push*bMove;}
        else{const push=Math.min(oy+1,12)*.6*(dy>=0?1:-1);a.y-=push*aMove;b.y+=push*bMove;}
      }
      for(const n of this.nodes){n.x=Math.max(65,Math.min(this.w-65,n.x));n.y=Math.max(50,Math.min(this.h-70,n.y));}
    }
    this.lineEls=this.edges.map(e=>{const line=el('path',{class:`graph-edge ${e.type==='REFINES'?'topic':''}`,'marker-end':`url(#${e.type==='REFINES'?'topic-arrow':'arrow'})`});const title=el('title',{},`${e.a.name} → ${e.b.name}\n${e.type==='REFINES'?'属于主题':'先修关系'}${e.rationale?'\n'+e.rationale:''}`);line.append(title);this.group.append(line);return line;});
    this.nodeEls=this.nodes.map(n=>{
      const g=el('g',{class:`graph-node ${n.role==='focus'?'selected':''} ${n.depth>1&&n.role!=='focus'?'indirect':''}`,'data-node':n.id,tabindex:0,role:'button','aria-label':`查看${n.name}`});
      const role=colors[n.role]?n.role:'successor',stroke=colors[role][2];
      if(n.role==='focus')g.append(el('circle',{r:n.r+13,class:'node-halo'}));
      if(n.role==='focus')g.append(el('circle',{r:n.r+7,class:'node-ring'}));
      g.append(el('circle',{r:n.r,fill:`url(#node-${role})`,stroke,'stroke-width':1.3,opacity:n.depth>1?.86:1}));
      if(n.role==='focus'){g.append(el('circle',{r:4,fill:'#e3f2ff'}));}
      const t=el('text',{'text-anchor':'middle',y:n.r+19});
      const chars=Array.from(n.name),max=n.role==='focus'?12:10;
      const lines=chars.length<=max?[n.name]:[chars.slice(0,max).join(''),chars.slice(max,max*2-1).join('')+(chars.length>=max*2?'…':'')];
      lines.forEach((s,i)=>t.append(el('tspan',{x:0,dy:i?14:0},s)));g.append(t);
      const title=el('title',{},n.name);g.append(title);
      g.addEventListener('pointerenter',e=>{if(this.drag)return;this.tooltip.hidden=false;this.tooltip.textContent=n.name+' · '+({primary:'小学',junior:'初中',senior:'高中'}[n.stage]??'');const r=this.svg.getBoundingClientRect();this.tooltip.style.left=Math.min(e.clientX-r.left+12,this.w-230)+'px';this.tooltip.style.top=Math.max(10,e.clientY-r.top-35)+'px';});
      g.addEventListener('pointerleave',()=>{this.tooltip.hidden=true;});this.group.append(g);return g;
    });
    this.fit();this.update();
  }
  update(){
    this.nodeEls?.forEach((g,i)=>g.setAttribute('transform',`translate(${this.nodes[i].x},${this.nodes[i].y})`));
    this.lineEls?.forEach((p,i)=>{const e=this.edges[i],dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,d=Math.max(Math.hypot(dx,dy),1),start=e.a.r+2,end=e.b.r+5;p.setAttribute('d',`M${e.a.x+dx/d*start} ${e.a.y+dy/d*start} L${e.b.x-dx/d*end} ${e.b.y-dy/d*end}`);});
  }
  apply(){this.group?.setAttribute('transform',`translate(${this.pan.x},${this.pan.y}) scale(${this.zoom})`);}
  scale(factor){const next=Math.min(3,Math.max(.45,this.zoom*factor));const ratio=next/this.zoom;this.pan={x:this.w/2-(this.w/2-this.pan.x)*ratio,y:this.h/2-(this.h/2-this.pan.y)*ratio};this.zoom=next;this.apply();}
  fit(){this.zoom=1;this.pan={x:0,y:0};this.apply();}
  down(e){if(e.button!==0)return;const id=e.target.closest('[data-node]')?.dataset.node;this.drag={id:id==null?null:Number(id),x:e.clientX,y:e.clientY,moved:false};this.svg.setPointerCapture(e.pointerId);this.tooltip.hidden=true;}
  move(e){if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)+Math.abs(dy)>2)this.drag.moved=true;this.drag.x=e.clientX;this.drag.y=e.clientY;if(this.drag.id!==null){const n=this.nodeById.get(this.drag.id);n.x+=dx/this.zoom;n.y+=dy/this.zoom;this.update();}else{this.pan.x+=dx;this.pan.y+=dy;this.apply();}}
  up(e){if(!this.drag)return;const d=this.drag;this.drag=null;if(this.svg.hasPointerCapture(e.pointerId))this.svg.releasePointerCapture(e.pointerId);if(!d.moved&&d.id!==null)this.onSelect(this.nodeById.get(d.id).key);}
}
